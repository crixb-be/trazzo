import {
  invalidResult,
  isFiniteNonNegative,
  type CalcCheck,
  type CalcResult,
  RNE_WARNING,
} from "./types";

export interface EvacuationInput {
  occupants: number;
  element: "puerta" | "pasadizo" | "escalera";
  healthWithoutSprinklers?: boolean;
  officePassage?: boolean;
  toEvacuationStair?: boolean;
}

export interface EvacuationValues {
  factor: number;
  width: number;
  minimumWidth: number;
}

/** Calculates A.130 evacuation width per occupant, with the mandated element minimums. */
export function computeEvacuationWidth(input: EvacuationInput): CalcResult<EvacuationValues> {
  if (
    !isFiniteNonNegative(input.occupants) ||
    !Number.isSafeInteger(input.occupants) ||
    input.occupants <= 0
  ) {
    return invalidResult(
      { factor: 0, width: 0, minimumWidth: input.element === "escalera" ? 1.2 : 1 },
      "La cantidad de ocupantes debe ser finita y mayor que cero.",
    );
  }

  const factor =
    input.healthWithoutSprinklers && input.element !== "pasadizo"
      ? input.element === "escalera"
        ? 0.015
        : 0.013
      : input.element === "escalera"
        ? 0.008
        : 0.005;
  const minimumWidth =
    input.element === "puerta"
      ? input.toEvacuationStair === false
        ? 0
        : 1
      : input.element === "pasadizo" && input.officePassage && input.occupants < 50
        ? 0.9
        : 1.2;
  const raw = input.occupants * factor;
  const rounded = input.element === "escalera" ? raw : Math.ceil((raw - 1e-10) / 0.6) * 0.6;
  const width = Math.max(rounded, minimumWidth);
  const checks: CalcCheck[] = [
    {
      label: "Ancho calculado para " + input.element,
      pass: width >= input.occupants * factor,
      value: width,
      limit: input.occupants * factor,
      ref: "A.130 · Arts. 22–24",
    },
    {
      label: "Ancho mínimo del elemento",
      pass: width >= minimumWidth,
      value: width,
      limit: minimumWidth,
      ref: "A.130 · Arts. 22–24",
    },
  ];

  return { ok: true, values: { factor, width, minimumWidth }, checks, warnings: [RNE_WARNING] };
}
