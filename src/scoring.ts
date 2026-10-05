export type Band = {
  zeroBelow: number;
  idealFrom: number;
  idealTo: number;
  zeroAbove: number;
};

export type WeightedDesire = {
  desire: number;
  weight: number;
};

export type Fit =
  | { status: "not_applicable" }
  | { status: "scored"; value: number };

// 0 outside, 1 on the flat top, linear on each shoulder
export function desire(value: number, band: Band): number {
  if (value <= band.zeroBelow || value >= band.zeroAbove) return 0;
  if (value >= band.idealFrom && value <= band.idealTo) return 1;
  if (value < band.idealFrom) {
    return (value - band.zeroBelow) / (band.idealFrom - band.zeroBelow);
  }
  return (band.zeroAbove - value) / (band.zeroAbove - band.idealTo);
}

type ScoreOptions = {
  applicable?: boolean;
  veto?: boolean;
};

export function score(
  parts: readonly WeightedDesire[],
  options: ScoreOptions = {},
): Fit {
  if (options.applicable === false) return { status: "not_applicable" };
  if (options.veto) return { status: "scored", value: 0 };

  const weight = parts.reduce((sum, part) => sum + part.weight, 0);
  if (weight === 0) return { status: "scored", value: 0 };

  const weighted = parts.reduce(
    (sum, part) => sum + part.desire * part.weight,
    0,
  );
  // nearest integer, thirds of a weight are not exact in binary
  return { status: "scored", value: Math.round((weighted / weight) * 100) };
}
