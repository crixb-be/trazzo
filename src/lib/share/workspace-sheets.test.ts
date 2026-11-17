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
    { id: "sala", name: "Sala" },
    { id: "cocina", name: "Cocina" },
    { id: "patio", name: "Patio" },
  ],
  relations: {
    '["cocina","sala"]': "necesaria",
    '["patio","sala"]': "deseable",
  },
  weights: DEFAULT_WEIGHTS,
};

describe("workspace result sheets", () => {
  it("creates a shareable and savable materials sheet", () => {
    const sheet = materialsResultSheet({
      modeLabel: "Muro de ladrillo",
      lines: [{ name: "Ladrillo", quantity: 120, unit: "und", pricePen: 1.4 }],
    });
    expect(sheet.kind).toBe("calculo");
    expect(sheet.title).toBe("Muro de ladrillo");
    expect(sheet.rows[0]).toMatchObject({ label: "Ladrillo" });
    expect(sheetText(sheet)).toContain("120.000 und");
  });

  it("creates a field-tools sheet with its result as both subtitle and row", () => {
    const sheet = fieldToolResultSheet({
      toolLabel: "Conversor de unidades",
      result: "100 cm",
    });
    expect(sheet.eyebrow).toContain("UTILIDADES DE CAMPO");
    expect(sheet.subtitle).toBe("100 cm");
    expect(sheet.rows).toEqual([{ label: "Resultado", value: "100 cm" }]);
  });

  it("summarises matrix priorities and relation counts", () => {
    const sheet = matrixResultSheet(matrix, [
      { id: "sala", name: "Sala", score: 4 },
      { id: "cocina", name: "Cocina", score: 3 },
      { id: "patio", name: "Patio", score: 1 },
    ]);
    expect(sheet.title).toBe("Matriz de relaciones");
    expect(sheet.rows).toEqual(
      expect.arrayContaining([
        { label: "Ambientes", value: "3" },
        { label: "Prioridad 1", value: "Sala · 4 puntos" },
        { label: "Necesarias", value: "1" },
        { label: "Deseables", value: "1" },
      ]),
    );
  });

  it("creates a measure sheet with dimensions and its design warning", () => {
    const sheet = measureResultSheet(MEASURES[0]);
    expect(sheet.title).toBe(MEASURES[0].title);
    expect(sheet.rows).toEqual(
      expect.arrayContaining([
        { label: "Ancho", value: "0.6 m" },
        { label: "Profundidad", value: "1.7 m" },
      ]),
    );
    expect(sheet.notes.join(" ")).toContain("no representa un mínimo normativo");
  });
});
