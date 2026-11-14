import { describe, expect, it } from "vitest";
import { computeStair } from "./stairs";

describe("computeStair", () => {
  it("calculates a 2.70 m floor height", () => {
    const result = computeStair({ floorHeight: 2.7, width: 0.9, use: "vivienda" });
    expect(result.values.risers).toBe(15);
    expect(result.values.riserHeight).toBeCloseTo(0.18);
    expect(result.values.blondel).toBeCloseTo(0.63);
  });

  it("keeps a normal home stair within one flight", () => {
    const result = computeStair({ floorHeight: 2.8, width: 0.9, use: "vivienda" });
    expect(result.values.flights).toBe(1);
    expect(result.values.landings).toBe(0);
    expect(result.ok).toBe(true);
  });

  it("splits stairs over 17 risers", () => {
    const result = computeStair({ floorHeight: 4, width: 1.2, use: "evacuacion" });
    expect(result.values.flights).toBe(2);
    expect(result.values.landings).toBe(1);
    expect(Math.max(...result.values.risersPerFlight)).toBeLessThanOrEqual(17);
  });

  it("rejects a narrow evacuation stair", () => {
    const result = computeStair({ floorHeight: 2.7, width: 0.9, use: "evacuacion" });
    expect(result.ok).toBe(false);
    expect(result.checks.some((check) => check.ref.startsWith("A.130"))).toBe(true);
  });

  it("accepts a preferred tread at the lower boundary", () => {
    const result = computeStair({
      floorHeight: 2.7,
      preferredTread: 0.25,
      width: 0.9,
      use: "vivienda",
    });
    expect(result.values.tread).toBe(0.25);
    expect(result.checks.find((check) => check.label.includes("Paso"))?.pass).toBe(true);
  });

  it("warns instead of throwing on invalid input", () => {
    const result = computeStair({ floorHeight: Number.NaN, width: 0.9, use: "vivienda" });
    expect(result.ok).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
