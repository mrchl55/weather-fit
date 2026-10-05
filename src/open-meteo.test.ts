import { describe, expect, it } from "vitest";
import { scoreSkiing } from "./activities/skiing.js";
import { scoreSurfing } from "./activities/surfing.js";
import { mapDays, type ForecastDay } from "./open-meteo.js";

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
