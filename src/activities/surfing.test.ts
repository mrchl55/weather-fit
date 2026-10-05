import { describe, expect, it } from "vitest";
import { scoreSurfing, type SurfDay } from "./surfing.js";

function day(overrides: Partial<SurfDay> = {}): SurfDay {
  return {
    waveHeightM: 1.2,
    wavePeriodS: 12,
    windKmh: 10,
    weatherCode: 1,
    ...overrides,
  };
}

describe("scoreSurfing", () => {
  it("scores a day inside both ideal bands at 100", () => {
    expect(scoreSurfing(day())).toEqual({ status: "scored", value: 100 });
  });

  it("does not score a place with no marine data", () => {
    expect(scoreSurfing(day({ waveHeightM: null }))).toEqual({
      status: "not_applicable",
    });
    expect(scoreSurfing(day({ wavePeriodS: null }))).toEqual({
      status: "not_applicable",
    });
  });

  it("scores a flat sea from the period alone", () => {
    expect(scoreSurfing(day({ waveHeightM: 0.4 }))).toEqual({
      status: "scored",
      value: 40,
    });
  });

  it("returns 0 when wind or the weather code is unsafe", () => {
    expect(scoreSurfing(day({ windKmh: 50 }))).toEqual({
      status: "scored",
      value: 0,
    });
    expect(scoreSurfing(day({ weatherCode: 95 }))).toEqual({
      status: "scored",
      value: 0,
    });
  });
});
