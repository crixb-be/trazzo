import {
  invalidResult,
  isFiniteNonNegative,
  type CalcCheck,
  type CalcResult,
  RNE_WARNING,
} from "./types";

export type WaterKind = "unifamiliar" | "multifamiliar" | "oficina";

export interface WaterValues {
  dailyLiters: number;
  dailyM3: number;
  cisternLiters: number;
  cisternM3: number;
  tankLiters: number;
  tankM3: number;
}

export interface ApartmentDemand {
  bedrooms: number;
  count: number;
}

const BEDROOM_DEMAND: Record<number, number> = {
  1: 500,
  2: 850,
  3: 1200,
  4: 1350,
  5: 1500,
};

function buildStorage(
  dailyLiters: number,
): Pick<WaterValues, "cisternLiters" | "cisternM3" | "tankLiters" | "tankM3"> {
  const cisternLiters = dailyLiters * 0.75;
  const tankLiters = Math.max(dailyLiters / 3, 1000);

  return {
    cisternLiters,
    cisternM3: cisternLiters / 1000,
    tankLiters,
    tankM3: tankLiters / 1000,
  };
}

function resultForDailyDemand(dailyLiters: number, warning?: string): CalcResult<WaterValues> {
  const storage = buildStorage(dailyLiters);
  const values: WaterValues = {
    dailyLiters,
    dailyM3: dailyLiters / 1000,
    ...storage,
  };
  const checks: CalcCheck[] = [
    {
      label: "Cisterna ≥ 3/4 de la dotación diaria",
      pass: values.cisternLiters >= dailyLiters * 0.75,
      value: values.cisternLiters,
      limit: dailyLiters * 0.75,
      ref: "IS.010 · Cap. II",
    },
    {
      label: "Tanque ≥ 1/3 de la dotación y ≥ 1,000 L",
      pass: values.tankLiters >= dailyLiters / 3 && values.tankLiters >= 1000,
      value: values.tankLiters,
      limit: Math.max(dailyLiters / 3, 1000),
      ref: "IS.010 · Cap. II",
    },
  ];
  const warnings = warning ? [warning, RNE_WARNING] : [RNE_WARNING];

  return { ok: checks.every((check) => check.pass), values, checks, warnings };
}

/** Calculates IS.010 single-family demand, including the >1,000 m² increment rule. */
export function singleFamilyDemand(lotArea: number): CalcResult<WaterValues> {
  if (!isFiniteNonNegative(lotArea) || lotArea <= 0) {
    return invalidResult(
      { dailyLiters: 0, dailyM3: 0, ...buildStorage(0) },
      "El área de lote debe ser finita y mayor que cero.",
    );
  }

  const baseArea = Math.min(lotArea, 1000);
  const baseDemand =
    baseArea <= 200
      ? 1500
      : baseArea <= 300
        ? 1700
        : baseArea <= 400
          ? 1900
          : baseArea <= 500
            ? 2100
            : baseArea <= 600
              ? 2200
              : baseArea <= 700
                ? 2300
                : baseArea <= 800
                  ? 2400
                  : baseArea <= 900
                    ? 2500
                    : 2600;
  const extraHundreds = Math.ceil(Math.max(0, lotArea - 1000) / 100);
  const dailyLiters = baseDemand + extraHundreds * 100;

  return resultForDailyDemand(dailyLiters);
}

/** Calculates the IS.010 apartment table for a list of unit types and counts. */
export function multiFamilyDemand(units: ApartmentDemand[]): CalcResult<WaterValues> {
  if (!Array.isArray(units) || units.length === 0) {
    return invalidResult(
      { dailyLiters: 0, dailyM3: 0, ...buildStorage(0) },
      "Ingresa al menos un tipo de departamento.",
    );
  }

  let dailyLiters = 0;
  for (const unit of units) {
    if (
      !Number.isInteger(unit.bedrooms) ||
      unit.bedrooms < 1 ||
      unit.bedrooms > 5 ||
      !isFiniteNonNegative(unit.count) ||
      unit.count <= 0
    ) {
      return invalidResult(
        { dailyLiters: 0, dailyM3: 0, ...buildStorage(0) },
        "Cada unidad debe tener de 1 a 5 dormitorios y una cantidad mayor que cero.",
      );
    }
    dailyLiters += BEDROOM_DEMAND[unit.bedrooms] * unit.count;
  }

  return resultForDailyDemand(dailyLiters);
}

/** Calculates office demand at 6 L/d per square metre of useful area. */
export function officeDemand(area: number): CalcResult<WaterValues> {
  if (!isFiniteNonNegative(area) || area <= 0) {
    return invalidResult(
      { dailyLiters: 0, dailyM3: 0, ...buildStorage(0) },
      "El área útil de oficina debe ser finita y mayor que cero.",
    );
  }

  return resultForDailyDemand(area * 6);
}

export interface StorageValues {
  cisternLiters: number;
  cisternM3: number;
  tankLiters: number;
  tankM3: number;
}

/** Returns minimum cistern and elevated tank capacities for a daily demand. */
export function storage(dailyDemand: number): CalcResult<StorageValues> {
  if (!isFiniteNonNegative(dailyDemand) || dailyDemand <= 0) {
    return invalidResult(
      { cisternLiters: 0, cisternM3: 0, tankLiters: 0, tankM3: 0 },
      "La dotación diaria debe ser finita y mayor que cero.",
    );
  }

  const values = buildStorage(dailyDemand);
  const checks: CalcCheck[] = [
    {
      label: "Cisterna ≥ 3/4 de la dotación",
      pass: values.cisternLiters >= dailyDemand * 0.75,
      value: values.cisternLiters,
      limit: dailyDemand * 0.75,
      ref: "IS.010 · Cap. II",
    },
    {
      label: "Tanque ≥ max(1/3, 1,000 L)",
      pass: values.tankLiters >= Math.max(dailyDemand / 3, 1000),
      value: values.tankLiters,
      limit: Math.max(dailyDemand / 3, 1000),
      ref: "IS.010 · Cap. II",
    },
  ];

  return { ok: true, values, checks, warnings: [RNE_WARNING] };
}

/** Compatibility wrapper used by the existing water calculator page. */
export function calculateWater(
  kind: WaterKind,
  input: number,
  bedrooms = 1,
): CalcResult<WaterValues> {
  if (kind === "unifamiliar") return singleFamilyDemand(input);
  if (kind === "oficina") return officeDemand(input);
  return multiFamilyDemand([{ bedrooms, count: input }]);
}

export type Check = CalcCheck;
export type { CalcResult } from "./types";
export { RNE_WARNING } from "./types";
