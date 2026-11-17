import {
  invalidResult,
  isFiniteNonNegative,
  type CalcCheck,
  RNE_WARNING,
  type CalcResult,
} from "./types";

export interface StairInput {
  activity?:
    | "vivienda"
    | "industria"
    | "oficinas"
    | "hospedaje"
    | "comercio"
    | "servicios"
    | "salud"
    | "educacion"
    | "transporte"
    | "recreacion";
  floorHeight: number;
  preferredTread?: number;
  width: number;
  use: "vivienda" | "evacuacion";
}

export interface StairValues {
  risers: number;
  riserHeight: number;
  tread: number;
  blondel: number;
  flights: number;
  landings: number;
  horizontalRun: number;
  risersPerFlight: number[];
  cp: number;
  step: number;
  run: number;
}

const ZERO_VALUES: StairValues = {
  risers: 0,
  riserHeight: 0,
  tread: 0,
  blondel: 0,
  flights: 0,
  landings: 0,
  horizontalRun: 0,
  risersPerFlight: [],
  cp: 0,
  step: 0,
  run: 0,
};

function buildFlights(risers: number): number[] {
  const flights = Math.ceil(risers / 18);
  const base = Math.floor(risers / flights);
  const remainder = risers % flights;

  return Array.from({ length: flights }, (_, index) => base + (index < remainder ? 1 : 0));
}

/**
 * Calculates an RNE A.010 stair using an optional Blondel design criterion and the 17-step flight rule.
 * References: A.010-2021 art.23.2, and A.130 arts.22–24 for evacuation width.
 */
export function computeStair(input: StairInput): CalcResult<StairValues> {
  const { floorHeight, preferredTread, width, use } = input;

  if (!isFiniteNonNegative(floorHeight) || floorHeight <= 0) {
    return invalidResult(ZERO_VALUES, "La altura piso a piso debe ser finita y mayor que cero.");
  }

  if (!isFiniteNonNegative(width) || width <= 0) {
    return invalidResult(ZERO_VALUES, "El ancho de la escalera debe ser finito y mayor que cero.");
  }

  if (
    preferredTread !== undefined &&
    (!isFiniteNonNegative(preferredTread) || preferredTread <= 0)
  ) {
    return invalidResult(ZERO_VALUES, "El paso preferido debe ser finito y mayor que cero.");
  }

  const risers = Math.ceil(floorHeight / 0.18 - 1e-9);
  const riserHeight = floorHeight / risers;
  const activity = input.activity ?? "vivienda";
  const minTread = ["vivienda", "industria"].includes(activity)
    ? 0.25
    : ["oficinas", "hospedaje", "comercio", "servicios"].includes(activity)
      ? 0.28
      : 0.3;
  const tread = preferredTread ?? Math.max(minTread, 0.63 - 2 * riserHeight);
  const blondel = 2 * riserHeight + tread;
  const risersPerFlight = buildFlights(risers);
  const flights = risersPerFlight.length;
  const landings = Math.max(0, flights - 1);
  const horizontalRun = risersPerFlight.reduce(
    (total, flightRisers) => total + Math.max(0, flightRisers - 1) * tread,
    0,
  );
  const minimumWidth = use === "evacuacion" || activity !== "vivienda" ? 1.2 : 0.9;
  const checks: CalcCheck[] = [
    {
      label: "Contrapaso ≤ 0.18 m",
      pass: riserHeight <= 0.18 + 1e-9,
      value: riserHeight,
      limit: 0.18,
      ref: "A.010-2021 · art. 23.2",
    },
    {
      label: "Paso mínimo por uso ≥ " + minTread + " m",
      pass: tread >= minTread - 1e-9,
      value: tread,
      limit: minTread,
      ref: "A.010-2021 · art. 23.2",
    },
    {
      label: "Pasos por tramo ≤ 17",
      pass: risersPerFlight.every((flightRisers) => flightRisers - 1 <= 17),
      value: Math.max(...risersPerFlight) - 1,
      limit: 17,
      ref: "A.010-2021 · art. 23.2",
    },
    {
      label: "Ancho mínimo para " + use,
      pass: width >= minimumWidth - 1e-9,
      value: width,
      limit: minimumWidth,
      ref: use === "evacuacion" ? "A.130 · Cap. V" : "A.010 · Cap. VI",
    },
  ];

  const warnings = [
    RNE_WARNING,
    "Blondel 2cp+p es criterio de diseño, no un intervalo exigido por A.010-2021. Paso mínimo por uso: vivienda/industria 0.25 m; hospedaje/comercio/oficinas/servicios comunales 0.28 m; salud/educación/recreación/transporte 0.30 m. El ancho por aforo requiere cálculo independiente.",
  ];
  if (flights > 1) {
    warnings.unshift("La altura requiere descansos entre tramos; verifica su geometría en planta.");
  }

  const values: StairValues = {
    risers,
    riserHeight,
    tread,
    blondel,
    flights,
    landings,
    horizontalRun,
    risersPerFlight,
    cp: riserHeight,
    step: tread,
    run: horizontalRun,
  };

  return { ok: checks.every((check) => check.pass), values, checks, warnings };
}

/** Compatibility wrapper for the existing calculator screen. */
export function calculateStairs(
  floorHeight: number,
  preferredTread?: number,
  width = 0.9,
  use: "vivienda" | "evacuacion" = "vivienda",
): CalcResult<StairValues> {
  return computeStair({ floorHeight, preferredTread, width, use });
}

export type Check = CalcCheck;
export type { CalcResult } from "./types";
