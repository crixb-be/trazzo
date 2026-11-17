import { it, expect } from "vitest";
import { computeLightWell } from "./lightwell";
it("A.020 cuadro4 primertramo, lados propios y mínimo multifamiliar", () => {
  expect(computeLightWell({ wallHeight: 9, kind: "habitable" }).values.minSide).toBeCloseTo(2.7);
  expect(
    computeLightWell({ wallHeight: 9, kind: "habitable", sides: 4 }).values.minSide,
  ).toBeCloseTo(3.15);
  expect(computeLightWell({ wallHeight: 4, kind: "servicios" }).values.minSide).toBe(2.1);
});
it("suma tramos, no aplica el último porcentaje a toda la altura", () => {
  expect(
    computeLightWell({ wallHeight: 36, kind: "habitable", sides: 2 }).values.minSide,
  ).toBeCloseTo(8.1);
  expect(
    computeLightWell({ wallHeight: 36, kind: "servicios", sides: 4 }).values.minSide,
  ).toBeCloseTo(8.28);
  expect(
    computeLightWell({ wallHeight: 73, kind: "habitable", sides: 2 }).values.minSide,
  ).toBeCloseTo(11.8);
});
it("base bifamiliar y entrada inválida", () => {
  expect(
    computeLightWell({ wallHeight: 4, kind: "servicios", building: "bifamiliar" }).values.minSide,
  ).toBe(1.8);
  expect(computeLightWell({ wallHeight: 0, kind: "servicios" }).ok).toBe(false);
  expect(computeLightWell({ wallHeight: 9, kind: "habitable", proposedSide: 2.2 }).ok).toBe(false);
});
