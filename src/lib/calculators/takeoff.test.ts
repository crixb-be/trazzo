import { describe, expect, it } from "vitest";
import { computeProjectTotals, computeTakeoffLine } from "./takeoff";

describe("takeoff calculators", () => {
  it("calculates a square-metre line with waste", () => {
    const result = computeTakeoffLine({
      unit: "m2",
      length: 4,
      width: 3,
      yieldFactor: 1,
      wastePct: 10,
      unitPrice: 10,
    });
    expect(result.values.total).toBeCloseTo(13.2);
    expect(result.values.subtotalPen).toBe(132);
  });

  it("rounds bags upwards", () => {
    const result = computeTakeoffLine({
      unit: "bls",
      quantity: 2.2,
      yieldFactor: 1,
      wastePct: 0,
      unitPrice: 5,
    });
    expect(result.values.total).toBe(3);
  });

  it("rounds units upwards after yield and waste", () => {
    const result = computeTakeoffLine({
      unit: "und",
      quantity: 2,
      yieldFactor: 1.39,
      wastePct: 0,
      unitPrice: 1.4,
    });
    expect(result.values.total).toBe(3);
  });

  it("calculates cubic metres", () => {
    const result = computeTakeoffLine({
      unit: "m3",
      length: 2,
      width: 1.5,
      height: 0.2,
      yieldFactor: 1,
      wastePct: 5,
      unitPrice: 420,
    });
    expect(result.values.quantity).toBeCloseTo(0.6);
    expect(result.values.subtotalPen).toBe(264.6);
  });

  it("aggregates totals per material", () => {
    const first = computeTakeoffLine({
      materialCode: "cemento",
      unit: "bls",
      quantity: 2,
      yieldFactor: 1,
      wastePct: 0,
      unitPrice: 28,
    }).values;
    const second = computeTakeoffLine({
      materialCode: "cemento",
      unit: "bls",
      quantity: 1,
      yieldFactor: 1,
      wastePct: 0,
      unitPrice: 28,
    }).values;
    const totals = computeProjectTotals([first, second]);
    expect(totals.byMaterial.cemento).toBe(84);
    expect(totals.grandTotal).toBe(84);
  });

  it("warns instead of throwing on invalid dimensions", () => {
    const result = computeTakeoffLine({
      unit: "m2",
      length: Number.NaN,
      width: 2,
      yieldFactor: 1,
      wastePct: 0,
      unitPrice: 10,
    });
    expect(result.ok).toBe(false);
  });
  it("uses a custom unit price for the subtotal", () => {
    const result = computeTakeoffLine({
      unit: "und",
      quantity: 2,
      yieldFactor: 1,
      wastePct: 0,
      unitPrice: 28,
    });
    expect(result.values.subtotalPen).toBe(56);
  });
});

it("agrupa cantidades de compra y conserva capítulos", async () => {
  const { shoppingList, chapterFor } = await import("./takeoff");
  expect(shoppingList([{materialCode:"cemento",total:2,subtotalPen:60},{materialCode:"cemento",total:3,subtotalPen:100}])).toEqual([{code:"cemento",quantity:5,cost:160}]);
  expect(chapterFor("[Estructuras] Columna")).toBe("Estructuras");
  expect(chapterFor("Columna")).toBe("Sin capítulo");
});
