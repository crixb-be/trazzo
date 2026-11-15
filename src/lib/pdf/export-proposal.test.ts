import { describe, expect, it } from "vitest";
import {
  calculateFeeQuote,
  createDefaultFeeInput,
  defaultDeliverables,
  defaultSchedule,
  formatPen,
} from "@/lib/calculators/fees";
import type { FeeQuote } from "@/lib/offline/db";
import { buildProposalPdf } from "./export-proposal";

describe("proposal PDF", () => {
  it("builds a readable proposal with optional watermark", () => {
    const input = createDefaultFeeInput();
    const result = calculateFeeQuote(input);
    const quote: FeeQuote = {
      id: "quote-1",
      code: "COT-2026-007",
      projectName: "Casa Lima",
      clientName: "Ana Pérez",
      location: "Miraflores",
      input,
      deliverables: defaultDeliverables(input),
      schedule: defaultSchedule(input),
      payment: {
        presetId: "50-50",
        installments: [
          { label: "Inicio", pct: 50 },
          { label: "Entrega", pct: 50 },
        ],
      },
      conditions: ["Vigencia de la cotización: 15 días calendario."],
      totals: { subtotal: result.subtotal, taxAmount: result.taxAmount, total: result.total },
      createdAt: "2026-11-14T00:00:00.000Z",
      updatedAt: "2026-11-14T00:00:00.000Z",
      syncState: "local",
    };
    const clean = buildProposalPdf(quote, result, {
      professional: { fullName: "Lucía Pérez", capNumber: "12345" },
      watermark: false,
      date: new Date(2026, 10, 14),
    });
    const cleanOutput = clean.output();
    expect(clean.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    expect(cleanOutput).toContain(quote.code);
    expect(cleanOutput).toContain("PROPUESTA DE SERVICIOS");
    expect(cleanOutput).toContain(formatPen(result.total));
    expect(cleanOutput).not.toContain("VISTA PREVIA");
    expect(
      buildProposalPdf(quote, result, {
        professional: { fullName: "", capNumber: "" },
        watermark: true,
        date: new Date(2026, 10, 14),
      }).output(),
    ).toContain("VISTA PREVIA");
  });
});
