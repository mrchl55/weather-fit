import { desire, score, type Band, type Fit } from "../scoring.js";

export type SurfDay = {
  waveHeightM: number | null;
  wavePeriodS: number | null;
  windKmh: number;
  weatherCode: number;
};

const WAVE_HEIGHT: Band = { zeroBelow: 0.4, idealFrom: 0.8, idealTo: 1.8, zeroAbove: 4 };
// right edge parked out of range so a long swell stays ideal
const WAVE_PERIOD: Band = { zeroBelow: 5, idealFrom: 8, idealTo: 20, zeroAbove: 30 };

const THUNDERSTORM = new Set([95, 96, 99]);

export function scoreSurfing(day: SurfDay): Fit {
  if (day.waveHeightM === null || day.wavePeriodS === null) {
    return { status: "not_applicable" };
  }

  // speed can only veto. direction needs a shore bearing we do not have
  const veto = day.windKmh >= 50 || THUNDERSTORM.has(day.weatherCode);
  return score(
    [
      { desire: desire(day.waveHeightM, WAVE_HEIGHT), weight: 60 },
      { desire: desire(day.wavePeriodS, WAVE_PERIOD), weight: 40 },
    ],
    { veto },
  );
}
