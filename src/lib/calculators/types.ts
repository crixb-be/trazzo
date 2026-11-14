/** A single normative validation shown alongside a calculator result. */
export interface CalcCheck {
  label: string;
  pass: boolean;
  value: number | string;
  limit: number | string;
  ref: string;
}

/** A calculator result that reports invalid inputs as warnings instead of throwing. */
export interface CalcResult<T> {
  ok: boolean;
  values: T;
  checks: CalcCheck[];
  warnings: string[];
}

export const RNE_WARNING =
  "Valores referenciales según la edición indicada del RNE. Verifica la versión vigente publicada por el MVCS antes de usar en expedientes.";

export function isFiniteNonNegative(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value >= 0;
}

export function invalidResult<T>(values: T, message: string): CalcResult<T> {
  return {
    ok: false,
    values,
    checks: [],
    warnings: [message, RNE_WARNING],
  };
}
