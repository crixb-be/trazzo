interface NumberConstraints {
  allowNegative?: boolean;
  min?: number;
  max?: number;
}

export function validateNumberRaw(
  raw: string,
  { allowNegative, min, max }: NumberConstraints = {},
) {
  const invalid = (error: string) => ({ value: null, error });
  if (!raw) return { value: null, error: undefined };
  if (!allowNegative && raw.includes("-")) return invalid("Solo valores positivos");
  if (!/^-?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(raw)) {
    if (/^-?[.,]?$/.test(raw)) return { value: null, error: undefined };
    return invalid("Usa un solo separador decimal, sin separadores de miles");
  }
  const value = Number(raw.replace(",", "."));
  if (!Number.isFinite(value)) return invalid("Ingresa un número válido");
  if (min !== undefined && value < min) return invalid(`El valor mínimo es ${min}`);
  if (max !== undefined && value > max) return invalid(`El valor máximo es ${max}`);
  return { value, error: undefined };
}

export function parseNumberRaw(raw: string): number | null {
  return validateNumberRaw(raw, { allowNegative: true }).value;
}

export function formatNumberRaw(value: number | null): string {
  return value === null || !Number.isFinite(value) ? "" : String(value);
}
