import { describe, expect, it } from "vitest";
import { MATERIALS } from "@/data/seed-rne";
import { DEFAULT_MATERIAL_INPUT } from "@/data/rendimientos";
import { recipePart, rectangularRoomParts, roomPartTakeoffs } from "./room";
import { PARTIDAS } from "@/data/partidas";
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
    expect(slab.name.replace(/\u00a0/g, " ")).toBe("Falso piso / contrapiso (e = 5 cm)");
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

describe("partida con receta", () => {
  const partida = (id: string) => PARTIDAS.find((item) => item.id === id)!;
  const sand = (cm: number) =>
    roomPartTakeoffs(recipePart(partida("contrapiso"), 20, cm), MATERIALS).find(
      ({ materialCode }) => materialCode === "arena-gruesa",
    )!.quantity;

  it("aplica 5 cm por defecto al contrapiso y lo muestra en el nombre", () => {
    const plain = (text: string) => text.replace(/\u00a0/g, " ");
    const part = recipePart(partida("contrapiso"), 20);
    expect(part.thickness).toBe(0.05);
    expect(plain(part.name)).toBe("Contrapiso (e = 5 cm)");
    const [line] = roomPartTakeoffs(part, MATERIALS);
    expect(plain(line.partName).startsWith("[Pisos] Contrapiso (e = 5 cm) · ")).toBe(true);
  });

  it("usa el espesor ingresado en cm: 10 cm lleva el doble de arena que 5 cm", () => {
    expect(recipePart(partida("contrapiso"), 20, 10).thickness).toBe(0.1);
    expect(sand(10)).toBeCloseTo(sand(5) * 2, 9);
  });

  it("no cambia las demás recetas aunque se indique un espesor", () => {
    const part = recipePart(partida("tarrajeo"), 20, 10);
    expect(part).toEqual({ id: "tarrajeo", name: "Tarrajeo", chapter: "Revestimientos", area: 20 });
    expect(roomPartTakeoffs(part, MATERIALS).map(({ quantity }) => quantity)).toEqual(
      computeMaterials("tarrajeo", { ...DEFAULT_MATERIAL_INPUT, area: 20 }).map(
        ({ quantity }) => quantity,
      ),
    );
  });

  it.each([0, -1, NaN])("rechaza %s como área", (area) => {
    expect(() => recipePart(partida("muro"), area)).toThrow(/área/);
  });

  it.each([0, 31, NaN])("rechaza %s cm como espesor de contrapiso", (cm) => {
    expect(() => recipePart(partida("contrapiso"), 20, cm)).toThrow(/espesor/);
  });
});
