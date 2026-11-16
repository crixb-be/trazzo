import {
  invalidResult,
  isFiniteNonNegative,
  type CalcCheck,
  RNE_WARNING,
  type CalcResult,
} from "./types";

export interface StairInput {
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
  const flights = Math.ceil(risers / 17);
  const base = Math.floor(risers / flights);
  const remainder = risers % flights;

  return Array.from({ length: flights }, (_, index) => base + (index < remainder ? 1 : 0));
}

/**
 * Calculates an RNE A.010 stair using 2cp+p and the 17-riser flight rule.
 * References: A.010, Cap. VI, and A.130, Cap. V for evacuation width.
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
  const tread = preferredTread ?? Math.max(0.25, 0.63 - 2 * riserHeight);
  const blondel = 2 * riserHeight + tread;
  const risersPerFlight = buildFlights(risers);
  const flights = risersPerFlight.length;
  const landings = Math.max(0, flights - 1);
  const horizontalRun = risersPerFlight.reduce(
    (total, flightRisers) => total + Math.max(0, flightRisers - 1) * tread,
    0,
  );
  const minimumWidth = use === "evacuacion" ? 1.2 : 0.9;
  const checks: CalcCheck[] = [
    {
      label: "Contrapaso ≤ 0.18 m",
      pass: riserHeight <= 0.18 + 1e-9,
      value: riserHeight,
      limit: 0.18,
      ref: "A.010 · Cap. VI",
    },
    {
      label: "Paso ≥ 0.25 m",
      pass: tread >= 0.25 - 1e-9,
      value: tread,
      limit: 0.25,
      ref: "A.010 · Cap. VI",
    },
    {
      label: "0.60 ≤ 2cp+p ≤ 0.64 m",
      pass: blondel >= 0.6 - 1e-9 && blondel <= 0.64 + 1e-9,
      value: blondel,
      limit: "0.60–0.64",
      ref: "A.010 · Cap. VI",
    },
    {
      label: "Contrapasos por tramo ≤ 17",
      pass: risersPerFlight.every((flightRisers) => flightRisers <= 17),
      value: Math.max(...risersPerFlight),
      limit: 17,
      ref: "A.010 · Cap. VI",
    },
    {
      label: "Ancho mínimo para " + use,
      pass: width >= minimumWidth - 1e-9,
      value: width,
      limit: minimumWidth,
      ref: use === "evacuacion" ? "A.130 · Cap. V" : "A.010 · Cap. VI",
    },
  ];

  const warnings = [RNE_WARNING];
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
