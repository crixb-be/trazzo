import { expect, it } from "vitest";
import { computeOccupancy } from "./occupancy";
import { computeFixtures } from "./fixtures";
import { computeDaylight } from "./daylight";
import { accessibleParking } from "./accessible-parking";
it("aforo redondea hacia arriba y admite área cero", () => {
  expect(computeOccupancy(95, 9.5)).toBe(10);
  expect(computeOccupancy(96, 9.5)).toBe(11);
  expect(computeOccupancy(0, 1)).toBe(0);
  expect(() => computeOccupancy(2, 0)).toThrow();
});
it("sanitarios comprueba saltos de tablas y exceso", () => {
  expect(computeFixtures(6, "oficina").urinals).toBe(1);
  expect(computeFixtures(7, "oficina").urinals).toBe(1);
  expect(computeFixtures(60, "oficina").toilets).toBe(2);
  expect(computeFixtures(61, "oficina").toilets).toBe(3);
  expect(computeFixtures(151, "oficina").toilets).toBe(4);
  expect(computeFixtures(0, "restaurante").toilets).toBe(0);
  expect(() => computeFixtures(1.1, "comercio")).toThrow();
});
it("iluminación distingue vidrio de apertura efectiva", () => {
  const r = computeDaylight(20, 10, 5, 2, 0.5);
  expect(r.requiredGlazing).toBe(2);
  expect(r.lightPass).toBe(true);
  expect(r.ventPass).toBe(false);
  expect(() => computeDaylight(20, 101, 5, 2, 1)).toThrow();
});
it("reserva accesible en cada frontera", () => {
  expect([0, 1, 20, 21, 50, 51, 400, 401, 500, 501].map(accessibleParking)).toEqual([
    0, 1, 1, 1, 2, 3, 16, 17, 20, 21,
  ]);
  expect(() => accessibleParking(-1)).toThrow();
  expect(() => accessibleParking(2.5)).toThrow();
});
