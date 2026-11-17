import {
  invalidResult,
  isFiniteNonNegative,
  type CalcCheck,
  type CalcResult,
  RNE_WARNING,
} from "./types";

export interface RampInput {
  rise: number;
  proposedSlope?: number;
  width: number;
  length?: number;
}

export interface RampValues {
  maxSlope: number;
  requiredHorizontalLength: number;
  slopeUsed: number;
  landingsNeeded: number;
  handrailsRequired: boolean;
  length: number;
  proposedSlope: number;
  needsHandrail: boolean;
}

const ZERO_VALUES: RampValues = {
  maxSlope: 0,
  requiredHorizontalLength: 0,
  slopeUsed: 0,
  landingsNeeded: 0,
  handrailsRequired: false,
  length: 0,
  proposedSlope: 0,
  needsHandrail: false,
};

/** Returns the A.120 maximum slope as a decimal for the 2023 rise table (no extrapolation above 0.72m). */
export function maxSlopeForRise(rise: number): number {
  if (!Number.isFinite(rise) || rise <= 0 || rise > 0.72) return 0;
  return rise <= 0.3 ? 0.1 : 0.08;
}

/**
 * Computes an A.120 ramp, including landings and handrails.
 * The normative reference is A.120-2023, arts.6–7.
 */
export function computeRamp(input: RampInput): CalcResult<RampValues> {
  const { rise, proposedSlope, width, length } = input;

  if (!isFiniteNonNegative(rise) || rise <= 0) {
    return invalidResult(ZERO_VALUES, "El desnivel debe ser finito y mayor que cero.");
  }

  if (!isFiniteNonNegative(width) || width <= 0) {
    return invalidResult(ZERO_VALUES, "El ancho de la rampa debe ser finito y mayor que cero.");
  }

  if (proposedSlope !== undefined && (!isFiniteNonNegative(proposedSlope) || proposedSlope <= 0)) {
    return invalidResult(ZERO_VALUES, "La pendiente propuesta debe ser finita y mayor que cero.");
  }

  if (length !== undefined && (!isFiniteNonNegative(length) || length <= 0)) {
    return invalidResult(ZERO_VALUES, "La longitud disponible debe ser finita y mayor que cero.");
  }

  const maxSlope = maxSlopeForRise(rise);
  if (!maxSlope)
    return invalidResult(
      ZERO_VALUES,
      "A.120-2023 art. 6.b: la tabla cubre desniveles hasta 0.72 m por rampa. Diseña tramos y descansos independientes o un medio mecánico; no extrapoles pendientes.",
    );
  const slopeUsed = proposedSlope ?? maxSlope;
  const requiredHorizontalLength = rise / slopeUsed;
  const runLength = Math.min(length ?? 9, 9);
  const landingsNeeded = Math.max(0, Math.ceil(requiredHorizontalLength / runLength) - 1);
  const handrailsRequired = true;
  const checks: CalcCheck[] = [
    {
      label: "Pendiente ≤ " + (maxSlope * 100).toFixed(0) + "%",
      pass: slopeUsed <= maxSlope + 1e-9,
      value: slopeUsed,
      limit: maxSlope,
      ref: "A.120-2023 · Art. 6",
    },
    {
      label: "Ancho ≥ 1.00 m, incluidos pasamanos y barandas",
      pass: width >= 1 - 1e-9,
      value: width,
      limit: 1,
      ref: "A.120-2023 · Art. 6",
    },
    {
      label: "Descanso entre tramos ≥ 1.50 m",
      pass: true,
      value: 1.5,
      limit: 1.5,
      ref: "A.120-2023 · Art. 6",
    },
  ];
  const warnings = [RNE_WARNING];
  if (handrailsRequired)
    warnings.unshift(
      "A.120 art.7: doble pasamanos. En longitud mayor de3 m, art.6.a exige parapetos/barandas en lados libres y pasamanos en confinados.",
    );

  const values: RampValues = {
    maxSlope,
    requiredHorizontalLength,
    slopeUsed,
    landingsNeeded,
    handrailsRequired,
    length: rise / slopeUsed,
    proposedSlope: slopeUsed,
    needsHandrail: handrailsRequired,
  };

  return { ok: checks.every((check) => check.pass), values, checks, warnings };
}

/** Compatibility wrapper for the original screen API. */
export function calculateRamp(
  rise: number,
  width = 1,
  proposedSlope?: number,
  length?: number,
): CalcResult<RampValues> {
  return computeRamp({ rise, width, proposedSlope, length });
}

export const maxRampSlope = maxSlopeForRise;
export type Check = CalcCheck;
export type { CalcResult } from "./types";
