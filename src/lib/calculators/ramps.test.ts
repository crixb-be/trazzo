import { describe, expect, it } from "vitest";
import { computeRamp, maxSlopeForRise } from "./ramps";

describe("computeRamp", () => {
  it.each([
    [0.25, 0.12],
    [0.26, 0.1],
    [0.75, 0.1],
    [0.76, 0.08],
    [2, 0.04],
    [2.01, 0.02],
  ])("uses the table at rise %s", (rise, expected) => {
    expect(maxSlopeForRise(rise)).toBe(expected);
  });

  it("computes required horizontal length", () => {
    const result = computeRamp({ rise: 0.75, width: 1 });
    expect(result.values.requiredHorizontalLength).toBeCloseTo(7.5);
    expect(result.values.slopeUsed).toBe(0.1);
  });

  it("rejects a proposed slope above the limit", () => {
    const result = computeRamp({ rise: 0.26, proposedSlope: 0.12, width: 1 });
    expect(result.ok).toBe(false);
  });

  it("requires a landing when the available run is short", () => {
    const result = computeRamp({ rise: 2, width: 1, length: 10 });
    expect(result.values.landingsNeeded).toBe(4);
    expect(result.checks.some((check) => check.label.includes("Descanso"))).toBe(true);
  });

  it("rejects a narrow ramp", () => {
    const result = computeRamp({ rise: 0.25, width: 0.9 });
    expect(result.ok).toBe(false);
  });

  it("warns on invalid values", () => {
    const result = computeRamp({ rise: -1, width: 1 });
    expect(result.ok).toBe(false);
    expect(result.warnings[0]).toMatch(/desnivel/i);
  });
});
