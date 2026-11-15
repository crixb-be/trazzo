import {
  DEFAULT_FEE_RATES,
  type FeeRates,
  type FeeTypology,
  type LicenseModality,
} from "@/lib/calculators/fees";
import { db } from "./db";

const KEY = "fees:customRates";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validRate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function mergeRates(value: unknown): FeeRates {
  const source = isRecord(value) ? value : {};
  const design = isRecord(source.designPerM2) ? source.designPerM2 : {};
  const specialty = isRecord(source.specialtyPerM2) ? source.specialtyPerM2 : {};
  const license = isRecord(source.licenseByModality) ? source.licenseByModality : {};
  const construction = isRecord(source.constructionCostPerM2) ? source.constructionCostPerM2 : {};

  const rate = (candidate: unknown, fallback: number): number =>
    validRate(candidate) ? candidate : fallback;
  const typology = (key: FeeTypology): number =>
    rate(design[key], DEFAULT_FEE_RATES.designPerM2[key]);
  const constructionRate = (key: FeeTypology): number =>
    rate(construction[key], DEFAULT_FEE_RATES.constructionCostPerM2[key]);
  const modality = (key: LicenseModality): number =>
    rate(license[key], DEFAULT_FEE_RATES.licenseByModality[key]);

  return {
    designPerM2: {
      "vivienda-unifamiliar": typology("vivienda-unifamiliar"),
      multifamiliar: typology("multifamiliar"),
      comercio: typology("comercio"),
      oficinas: typology("oficinas"),
      remodelacion: typology("remodelacion"),
    },
    floorFactorPerExtraFloor: rate(
      source.floorFactorPerExtraFloor,
      DEFAULT_FEE_RATES.floorFactorPerExtraFloor,
    ),
    maxFloorFactor: rate(source.maxFloorFactor, DEFAULT_FEE_RATES.maxFloorFactor),
    specialtyPerM2: {
      estructuras: rate(specialty.estructuras, DEFAULT_FEE_RATES.specialtyPerM2.estructuras),
      sanitarias: rate(specialty.sanitarias, DEFAULT_FEE_RATES.specialtyPerM2.sanitarias),
      electricas: rate(specialty.electricas, DEFAULT_FEE_RATES.specialtyPerM2.electricas),
    },
    renderUnit: rate(source.renderUnit, DEFAULT_FEE_RATES.renderUnit),
    virtualTour: rate(source.virtualTour, DEFAULT_FEE_RATES.virtualTour),
    licenseByModality: { A: modality("A"), B: modality("B"), C: modality("C"), D: modality("D") },
    supervisionVisit: rate(source.supervisionVisit, DEFAULT_FEE_RATES.supervisionVisit),
    supervisionPct: rate(source.supervisionPct, DEFAULT_FEE_RATES.supervisionPct),
    constructionCostPerM2: {
      "vivienda-unifamiliar": constructionRate("vivienda-unifamiliar"),
      multifamiliar: constructionRate("multifamiliar"),
      comercio: constructionRate("comercio"),
      oficinas: constructionRate("oficinas"),
      remodelacion: constructionRate("remodelacion"),
    },
    executionPct: rate(source.executionPct, DEFAULT_FEE_RATES.executionPct),
  };
}

export async function loadCustomFeeRates(): Promise<FeeRates | null> {
  if (!db) return null;
  const stored = await db.meta.get(KEY);
  if (!stored) return null;
  try {
    return mergeRates(JSON.parse(stored.value) as unknown);
  } catch {
    return null;
  }
}

export async function saveCustomFeeRates(rates: FeeRates): Promise<void> {
  if (!db) return;
  await db.meta.put({ key: KEY, value: JSON.stringify(mergeRates(rates)) });
}

export async function clearCustomFeeRates(): Promise<void> {
  if (!db) return;
  await db.meta.delete(KEY);
}

export function mergeCustomFeeRates(value: unknown): FeeRates {
  return mergeRates(value);
}
