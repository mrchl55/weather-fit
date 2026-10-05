import { desire, score, type Band, type Fit, type WeightedDesire } from "../scoring.js";

export type SkiDay = {
  elevationM: number;
  snowDepthCm: number | null;
  freshSnowCm: number;
  temperatureMaxC: number;
  windKmh: number;
  visibilityM: number;
  weatherCode: number;
};

const SNOW_DEPTH: Band = { zeroBelow: 0, idealFrom: 40, idealTo: 200, zeroAbove: 400 };
const FRESH_SNOW: Band = { zeroBelow: -10, idealFrom: 5, idealTo: 20, zeroAbove: 40 };
const TEMPERATURE: Band = { zeroBelow: -25, idealFrom: -10, idealTo: -2, zeroAbove: 3 };
const WIND: Band = { zeroBelow: -1, idealFrom: 0, idealTo: 20, zeroAbove: 60 };
const VISIBILITY: Band = { zeroBelow: 0, idealFrom: 8_000, idealTo: 40_000, zeroAbove: 50_000 };

// freezing rain 66 67, thunderstorm 95 96 99
const UNSAFE_WEATHER = new Set([66, 67, 95, 96, 99]);

export function scoreSkiing(day: SkiDay): Fit {
  const noSnow = (day.snowDepthCm ?? 0) === 0 && day.freshSnowCm === 0;
  // under 800m with no snow this place is not a ski hill
  if (day.elevationM < 800 && noSnow) return { status: "not_applicable" };

  const parts: WeightedDesire[] = [
    { desire: desire(day.freshSnowCm, FRESH_SNOW), weight: 15 },
    { desire: desire(day.temperatureMaxC, TEMPERATURE), weight: 20 },
    { desire: desire(day.windKmh, WIND), weight: 15 },
    { desire: desire(day.visibilityM, VISIBILITY), weight: 10 },
  ];
  if (day.snowDepthCm !== null) {
    parts.push({ desire: desire(day.snowDepthCm, SNOW_DEPTH), weight: 40 });
  }

  const veto = day.windKmh >= 70 || UNSAFE_WEATHER.has(day.weatherCode);
  return score(parts, { veto });
}
