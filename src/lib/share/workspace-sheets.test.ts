import { describe, expect, it } from "vitest";
import { MEASURES } from "@/data/medidas";
import { DEFAULT_WEIGHTS, type RelationMatrix } from "@/lib/matrix/relations";
import {
  fieldToolResultSheet,
  materialsResultSheet,
  matrixResultSheet,
  measureResultSheet,
} from "./workspace-sheets";
import { sheetText } from "./result-sheet";

const matrix: RelationMatrix = {
  rooms: [
    { id: "sala", name: "Sala", zone: "social" },
    { id: "cocina", name: "Cocina", zone: "servicio" },
    { id: "patio", name: "Patio", zone: "privada" },
  ],
  relations: { '["cocina","sala"]': "necesaria", '["patio","sala"]': "deseable" },
  weights: DEFAULT_WEIGHTS,
};

describe("workspace result sheets", () => {
  it("creates a shareable materials sheet", () => {
    const sheet = materialsResultSheet({
      modeLabel: "Muro de ladrillo",
      lines: [{ name: "Ladrillo", quantity: 120, unit: "und", pricePen: 1.4 }],
    });
    expect(sheet.kind).toBe("calculo");
    expect(sheet.rows[0]).toMatchObject({ label: "Ladrillo" });
    expect(sheetText(sheet)).toContain("120.000 und");
  });
  it("creates a field-tools sheet", () => {
    const sheet = fieldToolResultSheet({ toolLabel: "Conversor de unidades", result: "100 cm" });
    expect(sheet.rows).toEqual([{ label: "Resultado", value: "100 cm" }]);
  });
  it("summarises dense ranks and relation counts", () => {
    const sheet = matrixResultSheet(matrix, [
      { id: "sala", name: "Sala", zone: "social", sum: 6, rank: 1 },
      { id: "cocina", name: "Cocina", zone: "servicio", sum: 4, rank: 2 },
      { id: "patio", name: "Patio", zone: "privada", sum: 2, rank: 3 },
    ]);
    expect(sheet.title).toBe("Matriz de relaciones");
    expect(sheet.rows).toEqual(
      expect.arrayContaining([
        { label: "Rango 1", value: "Sala · 6 pts" },
        { label: "Necesarias", value: "1" },
        { label: "Deseables", value: "1" },
      ]),
    );
    expect(sheet.notes).toContain(
      "Ponderación del método: necesaria 4, deseable 2, innecesaria 0.",
    );
  });
  it("keeps the source and unit of a ratio measure without a depth row", () => {
    const measure = MEASURES.find((item) => item.id === "a090-sala-lectura")!;
    const { rows } = measureResultSheet(measure);

    expect(rows).toEqual(
      expect.arrayContaining([
        { label: measure.valueLabel, value: `${measure.width} ${measure.unit}` },
        { label: "Norma", value: measure.norm_code },
        { label: "Artículo", value: measure.article },
      ]),
    );
    expect(rows.some((row) => row.label === "Profundidad")).toBe(false);
  });

  it("creates a measure sheet", () => {
    const sheet = measureResultSheet(MEASURES[0]);
    expect(sheet.title).toBe(MEASURES[0].title);
    expect(sheet.rows).toEqual(
      expect.arrayContaining([
        { label: "Ancho", value: "0.6 m" },
        { label: "Profundidad", value: "1.7 m" },
      ]),
    );
  });
});
