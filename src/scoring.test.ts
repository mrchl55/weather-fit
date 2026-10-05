import { describe, expect, it } from "vitest";
import { desire, score } from "./scoring.js";

const band = {
  zeroBelow: 0,
  idealFrom: 10,
  idealTo: 20,
  zeroAbove: 30,
};

describe("desire", () => {
  it("stays at 1 across the ideal band, including both edges", () => {
    expect(desire(10, band)).toBe(1);
    expect(desire(15, band)).toBe(1);
    expect(desire(20, band)).toBe(1);
  });

  it("ramps linearly up the left shoulder", () => {
    expect(desire(5, band)).toBe(0.5);
  });

  it("ramps linearly down the right shoulder", () => {
    expect(desire(25, band)).toBe(0.5);
  });

  it("is 0 outside the band, including the outer edges", () => {
    expect(desire(-1, band)).toBe(0);
    expect(desire(0, band)).toBe(0);
    expect(desire(30, band)).toBe(0);
    expect(desire(31, band)).toBe(0);
  });
});

describe("score", () => {
  it("returns a weighted score from 0 to 100", () => {
    expect(
      score([
        { desire: 1, weight: 3 },
        { desire: 0, weight: 1 },
      ]),
    ).toEqual({ status: "scored", value: 75 });
  });

  it("returns 0 when a veto is set", () => {
    expect(score([{ desire: 1, weight: 1 }], { veto: true })).toEqual({
      status: "scored",
      value: 0,
    });
  });

  it("returns not applicable without looking at the parts", () => {
    expect(score([{ desire: 1, weight: 1 }], { applicable: false })).toEqual({
      status: "not_applicable",
    });
  });

  it("returns 0 when there is nothing to weigh", () => {
    expect(score([])).toEqual({ status: "scored", value: 0 });
    expect(score([{ desire: 1, weight: 0 }])).toEqual({
      status: "scored",
      value: 0,
    });
  });
});
