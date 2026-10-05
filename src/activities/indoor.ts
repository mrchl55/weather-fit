import { desire, score, type Band, type Fit } from "../scoring.js";

export type IndoorDay = {
  temperatureMaxC: number;
  precipitationMm: number;
};

// right edge parked so heavier rain stays a full reason to go in
const RAIN: Band = { zeroBelow: 0, idealFrom: 10, idealTo: 100, zeroAbove: 200 };
// flat top at and below 0. left edge parked out of range
const COLD: Band = { zeroBelow: -40, idealFrom: -20, idealTo: 0, zeroAbove: 18 };
// flat top at and above 36. right edge parked out of range
const HEAT: Band = { zeroBelow: 26, idealFrom: 36, idealTo: 60, zeroAbove: 80 };

export function scoreIndoor(day: IndoorDay): Fit {
  return score([
    // always on. a museum is a good plan on a clear day too
    { desire: 1, weight: 70 },
    { desire: desire(day.precipitationMm, RAIN), weight: 20 },
    { desire: desire(day.temperatureMaxC, COLD), weight: 5 },
    { desire: desire(day.temperatureMaxC, HEAT), weight: 5 },
  ]);
}
