import { describe, expect, it } from "vitest";
import {
  calculateFeeQuote,
  createDefaultFeeInput,
  defaultDeliverables,
  defaultSchedule,
  DEFAULT_FEE_RATES,
  formatPen,
  formatQuoteCode,
  paymentAmounts,
  validatePaymentPlan,
} from "./fees";

describe("fee engine", () => {
  it("calculates every enabled line with the default rates", () => {
    const input = createDefaultFeeInput();
    input.scope.renders = { enabled: true, count: 2, virtualTour: true };
    input.scope.license = { enabled: true, modality: "B" };
    input.scope.supervision = { enabled: true, mode: "visits", visitsPerWeek: 1, weeks: 4 };
    input.scope.execution.enabled = true;
    const result = calculateFeeQuote(input);
    expect(result.lines.map((line) => line.key)).toEqual([
      "design",
      "expediente",
      "renders",
      "license",
      "supervision",
      "execution",
    ]);
    expect(result.lines[0]?.amount).toBe(5562);
    expect(result.lines[1]?.amount).toBe(4320);
    expect(result.lines[2]?.amount).toBe(1560);
    expect(result.lines[3]?.amount).toBe(1500);
    expect(result.lines[4]?.amount).toBe(1000);
    expect(result.lines[5]?.amount).toBe(39600);
  });

  it("caps the floor factor", () => {
    const input = createDefaultFeeInput();
    input.floors = 20;
    expect(calculateFeeQuote(input).lines[0]?.detail).toContain("factor 1.30");
  });

  it("handles specialty subsets and warns for an empty expediente", () => {
    const input = createDefaultFeeInput();
    input.scope.expediente.estructuras = false;
    input.scope.expediente.sanitarias = false;
    input.scope.expediente.electricas = true;
    expect(calculateFeeQuote(input).lines[1]?.amount).toBe(1080);
    input.scope.expediente.electricas = false;
    const result = calculateFeeQuote(input);
    expect(result.warnings).toContain("Selecciona al menos una especialidad para el expediente.");
    expect(result.lines.some((line) => line.key === "expediente")).toBe(true);
  });

  it("supports visit and percentage supervision and budget overrides", () => {
    const input = createDefaultFeeInput();
    input.constructionBudget = 100000;
    input.scope.supervision = { enabled: true, mode: "percent", visitsPerWeek: 1, weeks: 8 };
    input.scope.execution.enabled = true;
    const result = calculateFeeQuote(input);
    expect(result.constructionBudget).toBe(100000);
    expect(result.lines.find((line) => line.key === "supervision")?.amount).toBe(3000);
    expect(result.lines.find((line) => line.key === "execution")?.amount).toBe(10000);
    input.scope.supervision.mode = "visits";
    expect(calculateFeeQuote(input).lines.find((line) => line.key === "supervision")?.amount).toBe(
      2000,
    );
  });

  it("calculates IGV and RxH retention", () => {
    const input = createDefaultFeeInput();
    const igv = calculateFeeQuote(input);
    expect(igv.taxLabel).toBe("IGV 18%");
    expect(igv.taxAmount).toBe(1778.76);
    expect(igv.total).toBe(11660.76);
    input.tax = "rxh";
    const rxh = calculateFeeQuote(input);
    expect(rxh.taxAmount).toBe(0);
    expect(rxh.retention).toBe(790.56);
    expect(rxh.netReceived).toBe(9091.44);
    input.constructionBudget = null;
    input.scope.design = false;
    input.scope.expediente = {
      enabled: false,
      estructuras: false,
      sanitarias: false,
      electricas: false,
    };
    input.scope.execution.enabled = true;
    input.constructionBudget = 1000;
    expect(calculateFeeQuote(input).retention).toBe(0);
  });

  it("sanitizes invalid numbers and never returns NaN", () => {
    const input = createDefaultFeeInput();
    input.areaM2 = Number.NaN;
    input.floors = -3;
    input.weeks = Number.POSITIVE_INFINITY;
    input.constructionBudget = -5;
    const result = calculateFeeQuote(input);
    expect(JSON.stringify(result)).not.toContain("NaN");
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("keeps payment amounts exactly equal to the total", () => {
    const installments = [
      { label: "A", pct: 33.33 },
      { label: "B", pct: 33.33 },
      { label: "C", pct: 33.34 },
    ];
    expect(paymentAmounts(100, installments).reduce((sum, amount) => sum + amount, 0)).toBe(100);
    expect(
      Math.round(
        paymentAmounts(100.01, installments).reduce((sum, amount) => sum + amount, 0) * 100,
      ) / 100,
    ).toBe(100.01);
    expect(validatePaymentPlan(installments).ok).toBe(true);
    expect(validatePaymentPlan([{ label: "A", pct: 20 }]).ok).toBe(false);
  });

  it("creates bounded schedules and deliverables", () => {
    const input = createDefaultFeeInput();
    input.scope.renders = { enabled: true, count: 4, virtualTour: true };
    input.scope.license = { enabled: true, modality: "C" };
    input.scope.supervision.enabled = true;
    input.scope.execution.enabled = true;
    const schedule = defaultSchedule(input);
    expect(schedule[0]?.fromWeek).toBe(1);
    expect(schedule.at(-1)?.toWeek).toBe(8);
    schedule.forEach((milestone, index) => {
      expect(milestone.fromWeek).toBeGreaterThanOrEqual(1);
      expect(milestone.toWeek).toBeLessThanOrEqual(8);
      if (index > 0) expect(milestone.fromWeek).toBe(schedule[index - 1]!.toWeek + 1);
    });
    const deliverables = defaultDeliverables(input);
    expect(deliverables).toContain("Planos de distribución, cortes y elevaciones");
    expect(deliverables).toContain("Planos y memoria de estructuras");
    expect(deliverables).toContain("4 renders HD");
    expect(deliverables).toContain("Recorrido virtual");
    expect(deliverables).toContain("Expediente para licencia municipal (Modalidad C)");
    expect(deliverables).toContain("Informes de supervisión por visita");
    expect(deliverables).toContain("Informes de avance y valorizaciones");
  });

  it("formats currency and quote codes deterministically", () => {
    expect(formatPen(12345.67)).toBe("S/ 12,345.67");
    expect(formatPen(Number.NaN)).toBe("S/ 0.00");
    expect(formatQuoteCode(2026, 7)).toBe("COT-2026-007");
    expect(formatQuoteCode(2026, 1000)).toBe("COT-2026-1000");
    expect(DEFAULT_FEE_RATES.executionPct).toBe(0.1);
  });
});
