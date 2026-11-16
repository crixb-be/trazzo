import { expect, it } from "vitest";
import { DEFAULT_MATERIAL_INPUT as p } from "@/data/rendimientos";
import { computeMaterials, steelKg } from "./quantities";
it("concreto aplica merma una vez y redondea bolsas", () => {
  const r = computeMaterials("concreto", p);
  expect(r[0].quantity).toBe(9);
  expect(r[1].quantity).toBeCloseTo(0.546);
});
it("muro cambia el número de piezas según aparejo", () => {
  expect(computeMaterials("muro", p)[0].quantity).toBeLessThan(
    computeMaterials("muro", { ...p, bond: 1 })[0].quantity,
  );
});
it("acabados redondean piezas completas y bolsas", () => {
  expect(computeMaterials("ceramico", { ...p, waste: 0 })[0].quantity).toBeCloseTo(
    50 * 0.45 * 0.45,
  );
  expect(computeMaterials("pintura", { ...p, waste: 0 })[0].quantity).toBeCloseTo(2 / 3);
});
it("acero convierte en ambas direcciones", () => {
  expect(steelKg(12.7, 9, 10)).toBeCloseTo(89.6056, 3);
  expect(
    computeMaterials("acero", { ...p, steelDirection: 1, steelQuantity: 10, waste: 0 })[0].quantity,
  ).toBe(10);
});
it("rechaza divisores nulos y valores no finitos", () => {
  expect(() => computeMaterials("pintura", { ...p, coverage: 0 })).toThrow();
  expect(() => computeMaterials("muro", { ...p, brickHeight: 0 })).toThrow();
  expect(() => computeMaterials("losa", { ...p, area: Infinity })).toThrow();
});
it("cero no compra materiales y losa combina concreto y ladrillo", () => {
  expect(computeMaterials("tarrajeo", { ...p, area: 0 }).every((x) => x.quantity === 0)).toBe(true);
  expect(computeMaterials("losa", p)).toHaveLength(4);
});
