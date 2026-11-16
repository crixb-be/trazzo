import { invalidResult, isFiniteNonNegative, type CalcResult } from "./types";

export type TakeoffUnit = "m2" | "m3" | "und" | "bls" | "varilla" | string;

export interface TakeoffLineInput {
  materialCode?: string;
  unit: TakeoffUnit;
  length?: number;
  width?: number;
  height?: number;
  quantity?: number;
  yieldFactor: number;
  wastePct: number;
  unitPrice: number;
}

export interface TakeoffLineValues {
  materialCode?: string;
  unit: string;
  quantity: number;
  total: number;
  subtotalPen: number;
  unitPrice: number;
}

export interface TakeoffTotals {
  byMaterial: Record<string, number>;
  grandTotal: number;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function baseQuantity(input: TakeoffLineInput): number {
  if (input.unit === "m2") return (input.length ?? 0) * (input.width ?? 0);
  if (input.unit === "m3") return (input.length ?? 0) * (input.width ?? 0) * (input.height ?? 0);
  return input.quantity ?? 0;
}

function zeroValues(input: TakeoffLineInput): TakeoffLineValues {
  return {
    materialCode: input.materialCode,
    unit: input.unit,
    quantity: 0,
    total: 0,
    subtotalPen: 0,
    unitPrice: input.unitPrice,
  };
}

/** Computes one material line using the material yield and waste percentage. */
export function computeTakeoffLine(input: TakeoffLineInput): CalcResult<TakeoffLineValues> {
  const numericInputs = [
    input.yieldFactor,
    input.wastePct,
    input.unitPrice,
    input.length,
    input.width,
    input.height,
    input.quantity,
  ];
  if (numericInputs.some((value) => value !== undefined && !isFiniteNonNegative(value))) {
    return invalidResult(
      zeroValues(input),
      "Las dimensiones, rendimiento, merma y precio deben ser finitos y no negativos.",
    );
  }

  const quantity = baseQuantity(input);
  const rawTotal = quantity * input.yieldFactor * (1 + input.wastePct / 100);
  const total = ["bls", "und", "varilla"].includes(input.unit) ? Math.ceil(rawTotal) : rawTotal;
  const values: TakeoffLineValues = {
    materialCode: input.materialCode,
    unit: input.unit,
    quantity,
    total,
    subtotalPen: roundMoney(total * input.unitPrice),
    unitPrice: input.unitPrice,
  };

  return { ok: true, values, checks: [], warnings: [] };
}

/** Aggregates lines by material code and rounds the project total to cents. */
export function computeProjectTotals(lines: TakeoffLineValues[]): TakeoffTotals {
  const byMaterial: Record<string, number> = {};
  let grandTotal = 0;

  for (const line of lines) {
    const key = line.materialCode ?? line.unit;
    byMaterial[key] = roundMoney((byMaterial[key] ?? 0) + line.subtotalPen);
    grandTotal += line.subtotalPen;
  }

  return { byMaterial, grandTotal: roundMoney(grandTotal) };
}

export interface TakeoffInput {
  materialCode?: string;
  unit: TakeoffUnit;
  length?: number;
  width?: number;
  height?: number;
  quantity?: number;
  yield_factor?: number;
  waste_pct: number;
  ref_price_pen: number;
}

export interface TakeoffResult {
  quantity: number;
  total: number;
  subtotal_pen: number;
}

export function calculateTakeoff(input: TakeoffInput): TakeoffResult {
  const result = computeTakeoffLine({
    materialCode: input.materialCode,
    unit: input.unit,
    length: input.length,
    width: input.width,
    height: input.height,
    quantity: input.quantity,
    yieldFactor: input.yield_factor ?? 1,
    wastePct: input.waste_pct,
    unitPrice: input.ref_price_pen,
  });

  return {
    quantity: result.values.quantity,
    total: result.values.total,
    subtotal_pen: result.values.subtotalPen,
  };
}

export type { CalcResult } from "./types";

/** Cantidades para comprar; conserva unidades del catálogo y precios propios de cada línea. */
export function shoppingList(
  lines: { materialCode: string; total: number; subtotalPen: number }[],
) {
  const result = new Map<string, { code: string; quantity: number; cost: number }>();
  for (const line of lines) {
    const row = result.get(line.materialCode) ?? { code: line.materialCode, quantity: 0, cost: 0 };
    row.quantity += line.total;
    row.cost += line.subtotalPen;
    result.set(row.code, row);
  }
  return [...result.values()];
}
export function chapterFor(name: string) {
  return name.match(/^\[([^\]]+)\]/)?.[1] ?? "Sin capítulo";
}
