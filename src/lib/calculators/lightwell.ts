import {
  invalidResult,
  isFiniteNonNegative,
  type CalcCheck,
  type CalcResult,
  RNE_WARNING,
} from "./types";

export interface LightWellInput {
  wallHeight: number;
  kind: "habitable" | "servicios";
  proposedSide?: number;
}

export interface LightWellValues {
  minSide: number;
  ratio: 3 | 4;
  baseSide: number;
  minimumSide: number;
}

const ZERO_VALUES: LightWellValues = {
  minSide: 0,
  ratio: 3,
  baseSide: 2.2,
  minimumSide: 0,
};

/**
 * Computes A.010 light-well geometry: H/3 for habitable rooms and H/4 for services.
 * The fixed minimums are 2.20 m and 1.80 m respectively.
 */
export function computeLightWell(input: LightWellInput): CalcResult<LightWellValues> {
  const { wallHeight, kind, proposedSide } = input;

  if (!isFiniteNonNegative(wallHeight) || wallHeight <= 0) {
    return invalidResult(ZERO_VALUES, "La altura del paramento debe ser finita y mayor que cero.");
  }

  if (proposedSide !== undefined && (!isFiniteNonNegative(proposedSide) || proposedSide <= 0)) {
    return invalidResult(ZERO_VALUES, "El lado propuesto debe ser finito y mayor que cero.");
  }

  const ratio = kind === "habitable" ? 3 : 4;
  const baseSide = kind === "habitable" ? 2.2 : 1.8;
  const minSide = Math.max(baseSide, wallHeight / ratio);
  const sideToCheck = proposedSide ?? minSide;
  const checks: CalcCheck[] = [
    {
      label: "Lado libre ≥ " + baseSide.toFixed(2) + " m",
      pass: sideToCheck >= baseSide - 1e-9,
      value: sideToCheck,
      limit: baseSide,
      ref: "A.010 · Cap. VIII",
    },
    {
      label: "Lado libre ≥ H/" + ratio,
      pass: sideToCheck >= wallHeight / ratio - 1e-9,
      value: sideToCheck,
      limit: wallHeight / ratio,
      ref: "A.010 · Cap. VIII",
    },
  ];

  const values: LightWellValues = { minSide, ratio, baseSide, minimumSide: minSide };
  return { ok: checks.every((check) => check.pass), values, checks, warnings: [RNE_WARNING] };
}

/** Compatibility wrapper accepting the old "services" spelling. */
export function calculateLightWell(
  wallHeight: number,
  kind: "habitable" | "services" = "habitable",
): CalcResult<LightWellValues> {
  return computeLightWell({ wallHeight, kind: kind === "services" ? "servicios" : kind });
}

export type Check = CalcCheck;
export type { CalcResult } from "./types";
export { RNE_WARNING } from "./types";
