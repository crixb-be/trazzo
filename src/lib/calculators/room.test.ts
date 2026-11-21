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

  it("produce las mismas líneas y cantidades que las recetas y usa precios del catálogo", () => {
    for (const part of rectangularRoomParts(size)) {
      const recipe = computeMaterials(part.id, { ...DEFAULT_MATERIAL_INPUT, area: part.area });
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
