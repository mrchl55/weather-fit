import { describe, expect, it } from "vitest";
import { scoreIndoor, type IndoorDay } from "./indoor.js";

function day(overrides: Partial<IndoorDay> = {}): IndoorDay {
  return {
    temperatureMaxC: 22,
    precipitationMm: 0,
    ...overrides,
  };
}

describe("scoreIndoor", () => {
  it("scores a clear day at the floor of 70", () => {
    expect(scoreIndoor(day())).toEqual({ status: "scored", value: 70 });
  });

  it("scores a soaked day above the floor", () => {
    expect(scoreIndoor(day({ precipitationMm: 10 }))).toEqual({
      status: "scored",
      value: 90,
    });
  });

  it("scores a dry freeze a little above the floor", () => {
    expect(scoreIndoor(day({ temperatureMaxC: 0 }))).toEqual({
      status: "scored",
      value: 75,
    });
  });
});
