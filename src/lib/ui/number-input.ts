export function sanitizeNumberRaw(raw: string, allowNegative = false): string {
  const normalized = raw.replace(/,/g, ".");
  const sign = allowNegative && normalized.startsWith("-") ? "-" : "";
  const unsigned = normalized.replace(/-/g, "");
  const parts = unsigned.split(".");
  const integer = parts[0].replace(/\D/g, "");
  const fraction = parts.slice(1).join("").replace(/\D/g, "");
  const hasSeparator = parts.length > 1;
  let cleanInteger = integer;

  if (cleanInteger.length > 1) cleanInteger = cleanInteger.replace(/^0+(?=\d)/, "");
  if (!cleanInteger && !hasSeparator) return sign;
  if (!cleanInteger && hasSeparator) return sign + "." + fraction;
  return sign + cleanInteger + (hasSeparator ? "." + fraction : "");
}

export function parseNumberRaw(raw: string): number | null {
  if (raw === "" || raw === "." || raw === "-") return null;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatNumberRaw(value: number | null): string {
  return value === null || !Number.isFinite(value) ? "" : String(value);
}
