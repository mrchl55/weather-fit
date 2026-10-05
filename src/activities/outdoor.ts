import { desire, score, type Band, type Fit } from "../scoring.js";

export type OutdoorDay = {
  temperatureMaxC: number;
  precipitationMm: number;
  windKmh: number;
  cloudCoverPct: number;
  uvIndex: number;
  weatherCode: number;
};

const TEMPERATURE: Band = { zeroBelow: 0, idealFrom: 18, idealTo: 26, zeroAbove: 36 };
// dry is the top. any rain leaves it immediately
const PRECIPITATION: Band = { zeroBelow: -1, idealFrom: 0, idealTo: 0, zeroAbove: 10 };
const WIND: Band = { zeroBelow: -1, idealFrom: 0, idealTo: 20, zeroAbove: 60 };
const CLOUD: Band = { zeroBelow: -1, idealFrom: 0, idealTo: 20, zeroAbove: 100 };
const UV: Band = { zeroBelow: -1, idealFrom: 0, idealTo: 5, zeroAbove: 11 };

// freezing rain 66 67, thunderstorm 95 96 99
const UNSAFE_WEATHER = new Set([66, 67, 95, 96, 99]);

export function scoreOutdoor(day: OutdoorDay): Fit {
  return score(
    [
      { desire: desire(day.temperatureMaxC, TEMPERATURE), weight: 30 },
      { desire: desire(day.precipitationMm, PRECIPITATION), weight: 40 },
      { desire: desire(day.windKmh, WIND), weight: 15 },
      { desire: desire(day.cloudCoverPct, CLOUD), weight: 10 },
      { desire: desire(day.uvIndex, UV), weight: 5 },
    ],
    { veto: UNSAFE_WEATHER.has(day.weatherCode) },
  );
}
