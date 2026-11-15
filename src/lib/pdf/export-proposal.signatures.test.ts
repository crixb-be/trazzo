import { describe, expect, it } from "vitest";
import {
  calculateFeeQuote,
  createDefaultFeeInput,
  defaultDeliverables,
  defaultSchedule,
  formatPen,
} from "@/lib/calculators/fees";
import type { FeeQuote } from "@/lib/offline/db";
import { DEFAULT_STUDIO_PROFILE } from "@/lib/offline/profile";
import { buildProposalPdf } from "./export-proposal";

function sampleQuote(overrides: Partial<FeeQuote> = {}): FeeQuote {
  const input = { ...createDefaultFeeInput(), lineOverrides: { design: 4000 } };
  const result = calculateFeeQuote(input);
  return {
    id: "quote-2",
    code: "COT-2026-010",
    projectName: "Casa Cayma",
    clientName: "Familia Quispe",
    clientDocument: "10456789",
    location: "Cayma, Arequipa",
    input,
    deliverables: defaultDeliverables(input),
    schedule: defaultSchedule(input),
    payment: { presetId: "50-50", installments: [{ label: "Inicio", pct: 100 }] },
    conditions: ["Vigencia: 15 días."],
    totals: { subtotal: result.subtotal, taxAmount: result.taxAmount, total: result.total },
    createdAt: "",
    updatedAt: "",
    syncState: "local",
    ...overrides,
  };
}

describe("proposal PDF signatures and edited amounts", () => {
  it("prints the edited line amount, its discount and filled signature data", () => {
    const quote = sampleQuote();
    const result = calculateFeeQuote(quote.input);
    const studio = {
      ...DEFAULT_STUDIO_PROFILE,
      fullName: "Ana Torres Ríos",
      capNumber: "12345",
      studioName: "B & E Arquitectura",
    };
    const output = buildProposalPdf(quote, result, { studio, watermark: false }).output();

    expect(output).toContain(formatPen(4000));
    expect(output).toContain(formatPen(result.total));
    expect(output).toContain("descuento");
    expect(output).toContain("DNI / RUC: 10456789");
    expect(output).toContain("Arq. Ana Torres R");
    expect(output).toContain("CAP N");
    expect(output).not.toContain("____");
  });

  it("leaves a clean signing space when names are missing", () => {
    const quote = sampleQuote({ clientName: "", clientDocument: "" });
    const output = buildProposalPdf(quote, calculateFeeQuote(quote.input), {
      studio: DEFAULT_STUDIO_PROFILE,
      watermark: false,
    }).output();
    expect(output).toContain("EL CONTRATANTE");
    expect(output).toContain("EL PROYECTISTA");
    expect(output).not.toContain("____");
  });
});
