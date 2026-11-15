import { describe, expect, it } from "vitest";
import {
  calculateFeeQuote,
  createDefaultFeeInput,
  lineAdjustmentPct,
  lineDetailForProposal,
} from "./fees";

describe("manual line amounts", () => {
  it("bills the manual amount, keeps the calculated base and reports the discount", () => {
    const input = createDefaultFeeInput();
    const base = calculateFeeQuote(input).lines.find((line) => line.key === "design");
    expect(base?.baseAmount).toBeGreaterThan(0);

    const discounted = (base?.baseAmount ?? 0) * 0.895;
    const result = calculateFeeQuote({ ...input, lineOverrides: { design: discounted } });
    const design = result.lines.find((line) => line.key === "design");
    expect(design?.overridden).toBe(true);
    expect(design?.amount).toBeCloseTo(discounted, 2);
    expect(design?.baseAmount).toBe(base?.baseAmount);
    expect(design && lineAdjustmentPct(design)).toBe(-10.5);
  });

  it("flows the edited amount into subtotal, IGV and total", () => {
    const input = createDefaultFeeInput();
    const original = calculateFeeQuote(input);
    const design = original.lines.find((line) => line.key === "design");
    const result = calculateFeeQuote({ ...input, lineOverrides: { design: 1000 } });
    const expectedSubtotal =
      Math.round((original.subtotal - (design?.amount ?? 0) + 1000) * 100) / 100;
    expect(result.subtotal).toBe(expectedSubtotal);
    expect(result.taxAmount).toBe(Math.round(expectedSubtotal * 0.18 * 100) / 100);
    expect(result.total).toBe(Math.round((result.subtotal + result.taxAmount) * 100) / 100);
  });

  it("ignores an override equal to the calculated amount or invalid values", () => {
    const input = createDefaultFeeInput();
    const base = calculateFeeQuote(input).lines.find((line) => line.key === "design");
    for (const value of [base?.baseAmount ?? 0, Number.NaN, -5]) {
      const line = calculateFeeQuote({ ...input, lineOverrides: { design: value } }).lines.find(
        (item) => item.key === "design",
      );
      expect(line?.overridden).toBe(false);
      expect(line?.amount).toBe(base?.baseAmount);
    }
  });

  it("keeps a line priced at 0 when the architect sets it manually", () => {
    const input = createDefaultFeeInput();
    const line = calculateFeeQuote({ ...input, lineOverrides: { design: 0 } }).lines.find(
      (item) => item.key === "design",
    );
    expect(line?.amount).toBe(0);
    expect(line?.overridden).toBe(true);
  });

  it("mentions the calculated price and discount in the proposal detail", () => {
    const input = createDefaultFeeInput();
    const line = calculateFeeQuote({ ...input, lineOverrides: { design: 4000 } }).lines.find(
      (item) => item.key === "design",
    );
    expect(line && lineDetailForProposal(line)).toMatch(/Precio calculado S\/ [\d,.]+, descuento/);
  });
});
