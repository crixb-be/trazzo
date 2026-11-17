import {
  invalidResult,
  isFiniteNonNegative,
  type CalcCheck,
  type CalcResult,
  RNE_WARNING,
} from "./types";

export type ClimateCharacter = "calido" | "templado" | "frio";

export interface WaterValues {
  dailyLiters: number;
  dailyM3: number;
  cisternLiters: number;
  cisternM3: number;
  tankLiters: number;
  tankM3: number;
}

export const RESIDENTIAL_WATER_BY_CLIMATE: Record<ClimateCharacter, number> = {
  calido: 169,
  templado: 155,
  frio: 129,
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

/** Calculates the residential IS.010 demand introduced by RM N° 0107-2025-VIVIENDA. */
export function residentialDemand(
  climate: ClimateCharacter,
  people: number,
): CalcResult<WaterValues> {
  if (!(climate in RESIDENTIAL_WATER_BY_CLIMATE)) {
    return invalidResult(
      { dailyLiters: 0, dailyM3: 0, ...buildStorage(0) },
      "Selecciona un carácter de clima válido.",
    );
  }
  if (!isFiniteNonNegative(people) || people <= 0) {
    return invalidResult(
      { dailyLiters: 0, dailyM3: 0, ...buildStorage(0) },
      "El número de personas debe ser finito y mayor que cero.",
    );
  }

  return resultForDailyDemand(RESIDENTIAL_WATER_BY_CLIMATE[climate] * people);
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

export type Check = CalcCheck;
export type { CalcResult } from "./types";
export { RNE_WARNING } from "./types";
