import { it, expect } from "vitest";
import { seismic2026, site2026 } from "./seismic";
import { fixtureSchedule } from "./fixtures";
const p = {
  zone: 4 as const,
  soil: "S1" as const,
  period: 0.04,
  U: 1,
  R0: 8,
  Ia: 1,
  Ip: 1,
  weight: 1000,
};
it("E.030-2026 distingue C corto espectral y estático", () => {
  const r = seismic2026(p);
  expect(r.C).toBeCloseTo(1.75);
  expect(r.Cstatic).toBe(2.5);
  expect(r.V).toBeCloseTo(140.625);
});
it("tablas4/5 sinVs30 y sueloS4zona4 fuera del modelo", () => {
  expect(site2026(4, "S2")).toEqual({ S: 1.1, TP: 0.6, TL: 2 });
  expect(site2026(2, "S3")).toEqual({ S: 1.4, TP: 0.9, TL: 1.6 });
  expect(() => site2026(4, "S4")).toThrow();
});
it("período largo y mínimo C/R", () => {
  const r = seismic2026({ ...p, period: 10 });
  expect(r.C).toBeCloseTo(0.025);
  expect(r.V).toBeCloseTo(49.5);
});
it("tablas sanitarias aplican población total y rango mixto", () => {
  expect(fixtureSchedule(6, "oficina").mixed.urinals).toBe(1);
  expect(fixtureSchedule(7, "oficina").women.toilets).toBe(1);
  expect(fixtureSchedule(20, "comercio", "publico").men.toilets).toBe(0);
  expect(fixtureSchedule(21, "comercio", "publico").mixed.toilets).toBe(1);
  expect(fixtureSchedule(16, "restaurante", "publico").men.toilets).toBe(0);
  expect(fixtureSchedule(17, "restaurante", "publico").women.toilets).toBe(1);
  expect(fixtureSchedule(101, "restaurante", "publico").men.toilets).toBe(3);
});
