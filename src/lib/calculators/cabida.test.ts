import { expect, it } from "vitest";
import { computeCabida, type CabidaInput } from "./cabida";
const p: CabidaInput = {
  lotArea: 200,
  frontage: 10,
  coefficient: 3,
  freePct: 30,
  maxHeight: 12,
  floorHeight: 3,
  frontSetback: 3,
  rearSetback: 0,
  leftSetback: 0,
  rightSetback: 0,
  salePct: 80,
};
it("limita por área libre y altura", () => {
  const r = computeCabida(p);
  expect(r.footprint).toBe(140);
  expect(r.gross).toBe(560);
  expect(r.saleable).toBe(448);
});
it("coeficiente limita techo y deja último piso parcial", () => {
  const r = computeCabida({ ...p, coefficient: 2 });
  expect(r.gross).toBe(400);
  expect(r.fullFloors).toBe(2);
  expect(r.partialArea).toBe(120);
});
it("retiros o altura incompatibles dan capacidad cero", () => {
  expect(computeCabida({ ...p, leftSetback: 10 }).gross).toBe(0);
  expect(computeCabida({ ...p, maxHeight: 2.9 }).floors).toBe(0);
  expect(computeCabida({ ...p, freePct: 100 }).gross).toBe(0);
});
it("rechaza porcentajes y geometría inválidos", () => {
  expect(() => computeCabida({ ...p, freePct: 101 })).toThrow();
  expect(() => computeCabida({ ...p, frontage: 0 })).toThrow();
  expect(() => computeCabida({ ...p, lotArea: NaN })).toThrow();
});
