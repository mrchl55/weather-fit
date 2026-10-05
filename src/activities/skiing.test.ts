import { describe, expect, it } from "vitest";
import { scoreSkiing, type SkiDay } from "./skiing.js";

function day(overrides: Partial<SkiDay> = {}): SkiDay {
  return {
    elevationM: 1_500,
    snowDepthCm: 80,
    freshSnowCm: 10,
    temperatureMaxC: -5,
    windKmh: 10,
    visibilityM: 20_000,
    weatherCode: 71,
    ...overrides,
  };
}

describe("scoreSkiing", () => {
  it("scores a day inside every ideal band at 100", () => {
    expect(scoreSkiing(day())).toEqual({ status: "scored", value: 100 });
  });

  it("does not score a lowland city with no snow", () => {
    expect(
      scoreSkiing(day({ elevationM: 120, snowDepthCm: 0, freshSnowCm: 0 })),
    ).toEqual({ status: "not_applicable" });
  });

  it("scores a bare mountain instead of calling it not applicable", () => {
    expect(
      scoreSkiing(day({ elevationM: 800, snowDepthCm: 0, freshSnowCm: 0 })),
    ).toEqual({ status: "scored", value: 55 });
  });

  it("returns 0 when wind or the weather code is unsafe", () => {
    expect(scoreSkiing(day({ windKmh: 70 }))).toEqual({
      status: "scored",
      value: 0,
    });
    expect(scoreSkiing(day({ weatherCode: 95 }))).toEqual({
      status: "scored",
      value: 0,
    });
  });

  it("drops a missing snow depth and renormalizes the other weights", () => {
    expect(scoreSkiing(day({ snowDepthCm: null, freshSnowCm: 40 }))).toEqual({
      status: "scored",
      value: 75,
    });
  });
});
