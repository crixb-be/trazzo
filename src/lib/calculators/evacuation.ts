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
}

export interface EvacuationValues {
  factor: number;
  width: number;
  minimumWidth: number;
}

/** Calculates A.130 evacuation width per occupant, with the mandated element minimums. */
export function computeEvacuationWidth(input: EvacuationInput): CalcResult<EvacuationValues> {
  if (!isFiniteNonNegative(input.occupants) || input.occupants <= 0) {
    return invalidResult(
      { factor: 0, width: 0, minimumWidth: input.element === "escalera" ? 1.2 : 1 },
      "La cantidad de ocupantes debe ser finita y mayor que cero.",
    );
  }

  const factor = input.element === "escalera" ? 0.008 : 0.005;
  const minimumWidth = input.element === "escalera" ? 1.2 : 1;
  const width = Math.max(input.occupants * factor, minimumWidth);
  const checks: CalcCheck[] = [
    {
      label: "Ancho calculado para " + input.element,
      pass: width >= input.occupants * factor,
      value: width,
      limit: input.occupants * factor,
      ref: "A.130 · Cap. V",
    },
    {
      label: "Ancho mínimo del elemento",
      pass: width >= minimumWidth,
      value: width,
      limit: minimumWidth,
      ref: "A.130 · Cap. V",
    },
  ];

  return { ok: true, values: { factor, width, minimumWidth }, checks, warnings: [RNE_WARNING] };
}
