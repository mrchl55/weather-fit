import { describe, expect, it } from "vitest";
import { scoreOutdoor, type OutdoorDay } from "./outdoor.js";

function day(overrides: Partial<OutdoorDay> = {}): OutdoorDay {
  return {
    temperatureMaxC: 22,
    precipitationMm: 0,
    windKmh: 10,
    cloudCoverPct: 10,
    uvIndex: 3,
    weatherCode: 1,
    ...overrides,
  };
}

describe("scoreOutdoor", () => {
  it("scores a shirtsleeve dry day at 100", () => {
    expect(scoreOutdoor(day())).toEqual({ status: "scored", value: 100 });
  });

  it("scores a soaked day from the other metrics", () => {
    expect(scoreOutdoor(day({ precipitationMm: 10 }))).toEqual({
      status: "scored",
      value: 60,
    });
  });

  it("returns 0 for a thunderstorm or freezing rain", () => {
    expect(scoreOutdoor(day({ weatherCode: 95 }))).toEqual({
      status: "scored",
      value: 0,
    });
    expect(scoreOutdoor(day({ weatherCode: 66 }))).toEqual({
      status: "scored",
      value: 0,
    });
  });
});
