import { z } from "zod";
import type { IndoorDay } from "./activities/indoor.js";
import type { OutdoorDay } from "./activities/outdoor.js";
import type { SkiDay } from "./activities/skiing.js";
import type { SurfDay } from "./activities/surfing.js";

const numbers = z.array(z.number());
const nullableNumbers = z.array(z.number().nullable());
const optionalText = z.string().nullable().optional();

const forecastDaily = {
  temperature_2m_max: numbers,
  precipitation_sum: numbers,
  snowfall_sum: numbers,
  snow_depth_mean: nullableNumbers,
  wind_speed_10m_max: numbers,
  weather_code: numbers,
  cloud_cover_mean: numbers,
  uv_index_max: numbers,
  visibility_mean: numbers,
};

const marineDaily = {
  wave_height_max: nullableNumbers,
  wave_period_max: nullableNumbers,
};

const forecastSchema = z.object({
  daily: z.object({
    time: z.array(z.string()),
    ...forecastDaily,
  }),
});

const marineSchema = z.object({
  daily: z.object({
    time: z.array(z.string()),
    ...marineDaily,
  }),
});

const searchSchema = z.object({
  results: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        country: optionalText,
        admin1: optionalText,
        latitude: z.number(),
        longitude: z.number(),
        elevation: z.number(),
        timezone: z.string(),
      }),
    )
    .optional(),
});

type Forecast = z.infer<typeof forecastSchema>;
type Marine = z.infer<typeof marineSchema>;

export type ForecastDay = {
  date: string;
  skiing: SkiDay;
  surfing: SurfDay;
  outdoor: OutdoorDay;
  indoor: IndoorDay;
};

type Waves = {
  height: number | null;
  period: number | null;
};

export function mapDays(
  forecast: unknown,
  marine: unknown,
  elevationM: number,
): ForecastDay[] {
  const weather = forecastSchema.parse(forecast);
  const sea = marineSchema.parse(marine);
  assertDailyAligned(weather.daily);
  assertDailyAligned(sea.daily);

  const waves = wavesByDate(sea);
  return weather.daily.time.map((date, index) => {
    // no marine row for this date means no coast, not a broken forecast
    const dayWaves = waves.get(date) ?? { height: null, period: null };
    return toDay(weather.daily, date, index, elevationM, dayWaves);
  });
}

function assertDailyAligned(daily: { time: readonly string[] }): void {
  for (const [name, values] of Object.entries(daily)) {
    if (name === "time" || !Array.isArray(values)) continue;
    if (values.length !== daily.time.length) {
      throw new Error(
        `${name} has ${values.length} values for ${daily.time.length} days`,
      );
    }
  }
}

function wavesByDate(marine: Marine): Map<string, Waves> {
  const byDate = new Map<string, Waves>();
  marine.daily.time.forEach((date, index) => {
    byDate.set(date, {
      height: at(marine.daily.wave_height_max, index),
      period: at(marine.daily.wave_period_max, index),
    });
  });
  return byDate;
}

function toDay(
  daily: Forecast["daily"],
  date: string,
  index: number,
  elevationM: number,
  waves: Waves,
): ForecastDay {
  const temperatureMaxC = at(daily.temperature_2m_max, index);
  const precipitationMm = at(daily.precipitation_sum, index);
  const windKmh = at(daily.wind_speed_10m_max, index);
  const weatherCode = at(daily.weather_code, index);
  const depthM = at(daily.snow_depth_mean, index);

  return {
    date,
    skiing: {
      elevationM,
      // api sends meters, skiing wants centimeters
      snowDepthCm: depthM === null ? null : Math.round(depthM * 100),
      freshSnowCm: at(daily.snowfall_sum, index),
      temperatureMaxC,
      windKmh,
      visibilityM: at(daily.visibility_mean, index),
      weatherCode,
    },
    surfing: {
      waveHeightM: waves.height,
      wavePeriodS: waves.period,
      windKmh,
      weatherCode,
    },
    outdoor: {
      temperatureMaxC,
      precipitationMm,
      windKmh,
      cloudCoverPct: at(daily.cloud_cover_mean, index),
      uvIndex: at(daily.uv_index_max, index),
      weatherCode,
    },
    indoor: {
      temperatureMaxC,
      precipitationMm,
    },
  };
}

function at<T>(values: readonly T[], index: number): T {
  const value = values[index];
  if (value === undefined) throw new Error(`missing value at ${index}`);
  return value;
}

const GEOCODING = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST = "https://api.open-meteo.com/v1/forecast";
const MARINE = "https://marine-api.open-meteo.com/v1/marine";
const FORECAST_DAYS = "7";

export type Place = {
  id: number;
  name: string;
  country: string | null;
  region: string | null;
  latitude: number;
  longitude: number;
  elevationM: number;
  timezone: string;
};

type FetchLike = (url: string) => Promise<Response>;

const NO_WAVES = {
  daily: { time: [], wave_height_max: [], wave_period_max: [] },
};

export async function searchPlaces(
  name: string,
  fetchImpl: FetchLike = fetch,
): Promise<Place[]> {
  const query = name.trim();
  if (query === "") return [];

  const body = await readOk(await fetchImpl(searchUrl(query)), "search");
  const parsed = searchSchema.parse(body);
  return (parsed.results ?? []).map((place) => ({
    id: place.id,
    name: place.name,
    country: place.country ?? null,
    region: place.admin1 ?? null,
    latitude: place.latitude,
    longitude: place.longitude,
    elevationM: place.elevation,
    timezone: place.timezone,
  }));
}

export async function loadForecast(
  place: Place,
  fetchImpl: FetchLike = fetch,
): Promise<ForecastDay[]> {
  const [forecastResponse, marineResponse] = await Promise.all([
    fetchImpl(forecastUrl(place)),
    fetchImpl(marineUrl(place)),
  ]);
  const forecast = await readOk(forecastResponse, "forecast");
  // a marine outage still leaves the week. surfing becomes not applicable
  const marine = marineResponse.ok ? await marineResponse.json() : NO_WAVES;
  return mapDays(forecast, marine, place.elevationM);
}

function searchUrl(name: string): string {
  const params = new URLSearchParams({ name, count: "5" });
  return `${GEOCODING}?${params}`;
}

function forecastUrl(place: Place): string {
  return weatherUrl(FORECAST, place, forecastDaily);
}

function marineUrl(place: Place): string {
  return weatherUrl(MARINE, place, marineDaily);
}

function weatherUrl(base: string, place: Place, daily: object): string {
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    daily: Object.keys(daily).join(","),
    timezone: place.timezone,
    forecast_days: FORECAST_DAYS,
  });
  return `${base}?${params}`;
}

async function readOk(response: Response, label: string): Promise<unknown> {
  if (!response.ok) throw new Error(`${label} failed: ${response.status}`);
  return response.json() as Promise<unknown>;
}
