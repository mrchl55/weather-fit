import { describe, expect, it } from "vitest";
import { scoreSkiing } from "./activities/skiing.js";
import { scoreSurfing } from "./activities/surfing.js";
import {
  loadForecast,
  mapDays,
  searchPlaces,
  type ForecastDay,
  type Place,
} from "./open-meteo.js";

function forecast(snowDepth: number | null, snowfall = 0) {
  return {
    latitude: 46.5,
    elevation: 2958,
    daily: {
      time: ["2026-10-05"],
      temperature_2m_max: [2.9],
      precipitation_sum: [0],
      snowfall_sum: [snowfall],
      snow_depth_mean: [snowDepth],
      wind_speed_10m_max: [21],
      weather_code: [3],
      cloud_cover_mean: [21],
      uv_index_max: [3.95],
      visibility_mean: [35358.33],
    },
  };
}

const inland = {
  daily: {
    time: ["2026-10-05"],
    wave_height_max: [null],
    wave_period_max: [null],
  },
};

const coast = {
  daily: {
    time: ["2026-10-05"],
    wave_height_max: [1.38],
    wave_period_max: [8.95],
  },
};

function first(weather: unknown, marine: unknown, elevationM: number): ForecastDay {
  const day = mapDays(weather, marine, elevationM)[0];
  if (!day) throw new Error("expected a day");
  return day;
}

describe("mapDays", () => {
  it("converts snow depth from meters to centimeters", () => {
    expect(first(forecast(0.87), inland, 2958).skiing.snowDepthCm).toBe(87);
  });

  it("keeps a missing snow depth missing", () => {
    expect(first(forecast(null), inland, 2958).skiing.snowDepthCm).toBeNull();
  });

  it("maps a low town with no snow to a ski day that does not apply", () => {
    const day = first(forecast(0), inland, 113);
    expect(day.skiing.freshSnowCm).toBe(0);
    expect(scoreSkiing(day.skiing)).toEqual({ status: "not_applicable" });
  });

  it("maps inland null waves to a surf day that does not apply", () => {
    const day = first(forecast(0), inland, 113);
    expect(day.surfing.waveHeightM).toBeNull();
    expect(day.surfing.wavePeriodS).toBeNull();
    expect(scoreSurfing(day.surfing)).toEqual({ status: "not_applicable" });
  });

  it("passes coastal wave height and period through", () => {
    const day = first(forecast(0), coast, 113);
    expect(day.surfing.waveHeightM).toBe(1.38);
    expect(day.surfing.wavePeriodS).toBe(8.95);
  });

  it("keeps the weather day when the marine date is missing", () => {
    const day = first(
      forecast(0.87),
      {
        daily: {
          time: ["2026-10-06"],
          wave_height_max: [1.38],
          wave_period_max: [8.95],
        },
      },
      2958,
    );
    expect(day.date).toBe("2026-10-05");
    expect(day.surfing.waveHeightM).toBeNull();
    expect(day.outdoor.temperatureMaxC).toBe(2.9);
    expect(day.indoor.precipitationMm).toBe(0);
  });

  it("rejects a payload that is missing the daily series", () => {
    expect(() => mapDays({}, inland, 113)).toThrow();
  });
});

const alps: Place = {
  id: 1,
  name: "Andermatt",
  country: "Switzerland",
  region: "Uri",
  latitude: 46.5,
  longitude: 8,
  elevationM: 2958,
  timezone: "Europe/Zurich",
};

function stubFetch(routes: { includes: string; status?: number; body: unknown }[]) {
  const urls: string[] = [];
  const fetchImpl = async (url: string): Promise<Response> => {
    urls.push(url);
    const route = routes.find((item) => url.includes(item.includes));
    if (!route) throw new Error(`unexpected ${url}`);
    return new Response(JSON.stringify(route.body), { status: route.status ?? 200 });
  };
  return { fetchImpl, urls };
}

describe("searchPlaces", () => {
  it("does not fetch a blank name", async () => {
    const fetchImpl = async (): Promise<Response> => {
      throw new Error("should not fetch");
    };
    expect(await searchPlaces("   ", fetchImpl)).toEqual([]);
  });

  it("maps a geocoding result and ignores the extra fields", async () => {
    const { fetchImpl, urls } = stubFetch([
      {
        includes: "geocoding-api",
        body: {
          results: [
            {
              id: 4409896,
              name: "Springfield",
              latitude: 37.21533,
              longitude: -93.29824,
              elevation: 396,
              country: "United States",
              admin1: "Missouri",
              timezone: "America/Chicago",
              population: 170188,
            },
          ],
        },
      },
    ]);

    expect(await searchPlaces("Springfield", fetchImpl)).toEqual([
      {
        id: 4409896,
        name: "Springfield",
        country: "United States",
        region: "Missouri",
        latitude: 37.21533,
        longitude: -93.29824,
        elevationM: 396,
        timezone: "America/Chicago",
      },
    ]);
    expect(urls[0]).toContain("count=5");
    expect(urls[0]).toContain("name=Springfield");
  });

  it("returns no places when the payload has no results", async () => {
    const { fetchImpl } = stubFetch([
      { includes: "geocoding-api", body: { generationtime_ms: 0.2 } },
    ]);
    expect(await searchPlaces("nowhere", fetchImpl)).toEqual([]);
  });
});

describe("loadForecast", () => {
  it("loads the forecast and the marine week for the place", async () => {
    const { fetchImpl, urls } = stubFetch([
      { includes: "api.open-meteo.com/v1/forecast", body: forecast(0.87) },
      { includes: "marine-api", body: coast },
    ]);

    const days = await loadForecast(alps, fetchImpl);
    expect(days[0]?.skiing.snowDepthCm).toBe(87);
    expect(days[0]?.skiing.elevationM).toBe(2958);
    expect(days[0]?.surfing.waveHeightM).toBe(1.38);
    expect(urls).toHaveLength(2);
    expect(urls.some((url) => url.startsWith("https://api.open-meteo.com/v1/forecast?"))).toBe(true);
    expect(urls.some((url) => url.startsWith("https://marine-api.open-meteo.com/v1/marine?"))).toBe(true);
    expect(urls[0]).toContain("timezone=Europe%2FZurich");
    expect(urls[0]).toContain("forecast_days=7");
    expect(urls[0]).toContain("snow_depth_mean");
  });

  it("still returns the week when marine fails", async () => {
    const { fetchImpl } = stubFetch([
      { includes: "api.open-meteo.com/v1/forecast", body: forecast(0.87) },
      { includes: "marine-api", status: 500, body: { reason: "down" } },
    ]);

    const days = await loadForecast(alps, fetchImpl);
    expect(days[0]?.skiing.snowDepthCm).toBe(87);
    expect(days[0]?.surfing.waveHeightM).toBeNull();
    expect(days[0]?.surfing.wavePeriodS).toBeNull();
  });

  it("throws when the forecast is not ok", async () => {
    const { fetchImpl } = stubFetch([
      { includes: "api.open-meteo.com/v1/forecast", status: 500, body: {} },
      { includes: "marine-api", body: inland },
    ]);
    await expect(loadForecast(alps, fetchImpl)).rejects.toThrow("forecast failed: 500");
  });
});
