import { describe, it, expect } from "vitest";
import { computeRamp, maxSlopeForRise } from "./ramps";
describe("A.120-2023 RM075 arts.6–7", () => {
  it.each([
    [0.25, 0.1],
    [0.3, 0.1],
    [0.31, 0.08],
    [0.72, 0.08],
    [0.73, 0],
    [2, 0],
  ])("tabla actual, desnivel %s", (rise, expected) => expect(maxSlopeForRise(rise)).toBe(expected));
  it("no extrapola por encima de0.72m", () =>
    expect(computeRamp({ rise: 1.2, width: 1 }).ok).toBe(false));
  it("calcula longitud por pendiente usada y descansa cada9m", () => {
    const r = computeRamp({ rise: 0.72, width: 1, proposedSlope: 0.06 });
    expect(r.values.length).toBe(12);
    expect(r.values.requiredHorizontalLength).toBe(12);
    expect(r.values.landingsNeeded).toBe(1);
  });
  it("rechaza12% aunque antes estuviera permitido", () =>
    expect(computeRamp({ rise: 0.25, width: 1, proposedSlope: 0.12 }).ok).toBe(false));
  it("no usa la longitud de tramo como longitud de descanso", () => {
    const r = computeRamp({ rise: 0.6, width: 1, length: 3 });
    expect(r.values.landingsNeeded).toBe(2);
    expect(r.checks.find((c) => c.label.includes("Descanso"))?.limit).toBe(1.5);
  });
  it("ancho y entradas inválidas", () => {
    expect(computeRamp({ rise: 0.3, width: 0.9 }).ok).toBe(false);
    expect(computeRamp({ rise: NaN, width: 1 }).ok).toBe(false);
  });
});
