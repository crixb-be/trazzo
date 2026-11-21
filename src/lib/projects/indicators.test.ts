import { expect, it } from "vitest";
import { projectIndicators } from "./indicators";

const takeoffs = [
  { partName: "[Estructuras] Columna", subtotalPen: 390 },
  { partName: "[Estructuras] Viga", subtotalPen: 210 },
  { partName: "[Acabados] Piso", subtotalPen: 400 },
];

it("calculates the ratio using current subtotals and lists unique chapters", () => {
  expect(projectIndicators({ builtArea: 50, takeoffs })).toEqual({
    area: 50,
    total: 1000,
    costPerSquareMeter: 20,
    count: 3,
    chapters: ["Estructuras", "Acabados"],
  });
});

it("distinguishes missing area and takeoffs from an explicit zero subtotal", () => {
  expect(projectIndicators({ builtArea: null, takeoffs })).toMatchObject({
    area: null,
    costPerSquareMeter: null,
    total: 1000,
  });
  expect(projectIndicators({ builtArea: 50, takeoffs: [] })).toMatchObject({
    total: null,
    costPerSquareMeter: null,
    count: 0,
  });
  expect(
    projectIndicators({ builtArea: 50, takeoffs: [{ partName: "Viga", subtotalPen: 0 }] }),
  ).toMatchObject({ total: 0, costPerSquareMeter: 0 });
});
