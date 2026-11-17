import { it, expect } from "vitest";
import {
  singleFamilyDemand,
  multiFamilyDemand,
  residentialDemand,
  storage,
  officeDemand,
  housingPeople,
} from "./water";
it.each([
  ["calido", 169],
  ["templado", 155],
  ["frio", 129],
] as const)("RM0107-2025 clima %s", (c, rate) =>
  expect(residentialDemand(3, c).values.dailyLiters).toBe(rate * 3),
);
it("A.020 densidad según dormitorios, no la tabla derogada", () => {
  expect(singleFamilyDemand(2, "templado").values.dailyLiters).toBe(465);
  expect(
    multiFamilyDemand(
      [
        { bedrooms: 1, count: 2 },
        { bedrooms: 5, count: 1 },
      ],
      "frio",
    ).values.dailyLiters,
  ).toBe(10 * 129);
  expect(housingPeople(3)).toBe(4);
});
it("rechaza fracciones y no interpreta área de lote como dormitorios", () => {
  expect(singleFamilyDemand(200).ok).toBe(false);
  expect(multiFamilyDemand([{ bedrooms: 2, count: 1.5 }]).ok).toBe(false);
  expect(residentialDemand(0, "frio").ok).toBe(false);
});
it("no atribuye al PDFmodificatorio tablas no incluidas", () => {
  expect(storage(1500).ok).toBe(false);
  expect(officeDemand(10).values.dailyLiters).toBe(200);
  expect(officeDemand(10, 20).values.dailyLiters).toBe(300);
});
