import { expect, it } from "vitest";
import { convertUnits, fractionInches, scalePlan } from "./units";
import { computeSlope } from "./slope";
import { polygonArea } from "./area";
it("convierte pulgadas fraccionarias y unidades dimensionales", () => {
  expect(convertUnits(fractionInches("3/8"), "pulgada", "mm")).toBeCloseTo(9.525);
  expect(convertUnits(1, "ha", "m2")).toBe(10000);
  expect(() => convertUnits(1, "kg", "m")).toThrow();
  expect(() => fractionInches("1/0")).toThrow();
});
it("escala ida y vuelta y rechaza cero", () => {
  expect(scalePlan(2, 100, "real")).toBe(2);
  expect(scalePlan(scalePlan(3, 50, "plano"), 50, "real")).toBe(3);
  expect(() => scalePlan(1, 0, "real")).toThrow();
});
it("pendientes equivalentes y horizontal", () => {
  expect(computeSlope(45, "grados").percent).toBeCloseTo(100);
  expect(computeSlope(12, "relación").percent).toBeCloseTo(100 / 12);
  expect(computeSlope(0, "porcentaje").denominator).toBeNull();
  expect(() => computeSlope(90, "grados")).toThrow();
});
it("área cóncava en ambos sentidos y coordenadas grandes", () => {
  const p = [
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 4, y: 4 },
    { x: 2, y: 2 },
    { x: 0, y: 4 },
  ];
  expect(polygonArea(p)).toBe(12);
  expect(polygonArea([...p].reverse())).toBe(12);
  expect(polygonArea(p.map((v) => ({ x: v.x + 1e6, y: v.y + 1e6 })))).toBe(12);
});
it("rechaza cruces y puntos repetidos", () => {
  expect(() =>
    polygonArea([
      { x: 0, y: 0 },
      { x: 2, y: 2 },
      { x: 0, y: 2 },
      { x: 2, y: 0 },
    ]),
  ).toThrow();
  expect(() =>
    polygonArea([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 2, y: 0 },
    ]),
  ).toThrow();
});
