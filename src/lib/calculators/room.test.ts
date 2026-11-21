import { describe, expect, it } from "vitest";
import { MATERIALS } from "@/data/seed-rne";
import { DEFAULT_MATERIAL_INPUT } from "@/data/rendimientos";
import { rectangularRoomParts, roomPartTakeoffs } from "./room";
import { computeMaterials } from "./materials/quantities";

describe("ambiente rectangular", () => {
  const size = { length: 5, width: 3, height: 2.5 };
  it("calcula los muros perimetrales, contrapiso, acabado y losa", () => {
    expect(rectangularRoomParts(size).map(({ id, area }) => [id, area])).toEqual([
      ["muro", 40],
      ["contrapiso", 15],
      ["ceramico", 15],
      ["losa", 15],
    ]);
  });

  it.each([0, -1, NaN, Infinity])("rechaza %s como dimensión", (value) => {
    expect(() => rectangularRoomParts({ ...size, length: value })).toThrow(/mayores que cero/);
  });

  it("usa 5 cm de falso piso / contrapiso por defecto, no el 1.5 cm del tarrajeo", () => {
    const slab = rectangularRoomParts(size).find(({ id }) => id === "contrapiso")!;
    expect(slab.thickness).toBe(0.05);
    expect(slab.name.replace(/ /g, " ")).toBe("Falso piso / contrapiso (e = 5 cm)");
  });

  it("convierte el espesor ingresado en cm a metros y escala el mortero", () => {
    const slab = (cm: number) =>
      rectangularRoomParts({ ...size, slabThicknessCm: cm }).find(({ id }) => id === "contrapiso")!;
    expect(slab(10).thickness).toBe(0.1);
    expect(slab(2).thickness).toBe(0.02);
    const sand = (cm: number) =>
      roomPartTakeoffs(slab(cm), MATERIALS).find(
        ({ materialCode }) => materialCode === "arena-gruesa",
      )!.quantity;
    // Mortar volume is linear in the thickness: 10 cm needs twice the sand of 5 cm.
    expect(sand(10)).toBeCloseTo(sand(5) * 2, 9);
    const expected = computeMaterials("contrapiso", {
      ...DEFAULT_MATERIAL_INPUT,
      area: 15,
      thickness: 0.1,
    });
    expect(roomPartTakeoffs(slab(10), MATERIALS).map(({ quantity }) => quantity)).toEqual(
      expected.map(({ quantity }) => quantity),
    );
  });

  it.each([0, -2, 31, NaN])("rechaza %s cm como espesor", (cm) => {
    expect(() => rectangularRoomParts({ ...size, slabThicknessCm: cm })).toThrow(/espesor/);
  });

  it("produce las mismas líneas y cantidades que las recetas y usa precios del catálogo", () => {
    for (const part of rectangularRoomParts(size)) {
      const recipe = computeMaterials(part.id, {
        ...DEFAULT_MATERIAL_INPUT,
        area: part.area,
        ...(part.thickness !== undefined ? { thickness: part.thickness } : {}),
      });
      const lines = roomPartTakeoffs(part, MATERIALS);
      expect(lines.map(({ materialCode, quantity }) => ({ code: materialCode, quantity }))).toEqual(
        recipe.map(({ code, quantity }) => ({ code, quantity })),
      );
      for (const line of lines) {
        const material = MATERIALS.find(({ code }) => code === line.materialCode)!;
        expect(line.partName).toBe("[" + part.chapter + "] " + part.name + " · " + material.name);
        expect(line.subtotalPen).toBeCloseTo(line.quantity * material.ref_price_pen, 2);
      }
    }
  });
});
