import { convertUnits, fractionInches, scalePlan } from "./units";

export const SCALE_PRESETS = [20, 25, 50, 75, 100, 125, 200, 250, 500] as const;

export const FIELD_EXTRA_TOOLS = [
  { id: "escalas", label: "Conversor de escalas", detail: "Plano y medidas reales" },
  { id: "techo", label: "Pendiente de techo", detail: "Inclinación y longitud de vertiente" },
  {
    id: "ocupacion",
    label: "Cobertura y área libre",
    detail: "Ocupación y coeficiente de edificación",
  },
  { id: "pies", label: "Pies y pulgadas ↔ metros", detail: "Conversión métrica e imperial" },
] as const;

export type FieldExtraTool = (typeof FIELD_EXTRA_TOOLS)[number]["id"];
export type ScaleDirection = "real" | "plano";
export const OCCUPANCY_NOTE =
  "Consulta los parámetros exigibles en el certificado de parámetros urbanísticos municipal.";

export function convertScale(
  value: number,
  denominator: number,
  direction: ScaleDirection,
): number {
  const converted = scalePlan(value, denominator, direction);
  if (!Number.isFinite(converted)) throw new Error("La longitud convertida está fuera de rango.");
  return converted;
}

export function roofPitch(rise: number, run: number) {
  if (!Number.isFinite(rise) || rise < 0 || !Number.isFinite(run) || run <= 0)
    throw new Error("Ingresa un desnivel no negativo y una proyección horizontal mayor que cero.");
  const percent = (rise / run) * 100;
  const degrees = (Math.atan2(rise, run) * 180) / Math.PI;
  const denominator = rise === 0 ? null : run / rise;
  const length = Math.hypot(rise, run);
  if (![percent, length, denominator ?? 0].every(Number.isFinite))
    throw new Error("La pendiente está fuera de rango.");
  return { percent, degrees, denominator, length };
}

export function lotCoverage(lot: number, firstFloor: number, builtTotal: number) {
  if (!Number.isFinite(lot) || lot <= 0)
    throw new Error("El área del lote debe ser mayor que cero.");
  if (![firstFloor, builtTotal].every((area) => Number.isFinite(area) && area >= 0))
    throw new Error("Ingresa áreas techadas no negativas.");
  if (firstFloor > builtTotal)
    throw new Error("El área techada del primer piso supera el área techada total.");
  const occupancy = (firstFloor / lot) * 100;
  const freeArea = 100 - occupancy;
  const coefficient = builtTotal / lot;
  if (![occupancy, coefficient].every(Number.isFinite))
    throw new Error("Las áreas están fuera de rango.");
  return {
    occupancy,
    freeArea,
    coefficient,
    warning: firstFloor > lot ? "El área techada del primer piso supera el área del lote." : null,
  };
}

export function imperialToMetric(feet: number, inches: string) {
  if (!Number.isFinite(feet) || feet < 0)
    throw new Error("Ingresa una medida en pies no negativa.");
  const text = inches.trim().replace(",", ".");
  const mixed = /^(\d+)\s+(\d+\/\d+)$/.exec(text);
  let parsed: number;
  if (mixed) parsed = Number(mixed[1]) + fractionInches(mixed[2]);
  else if (text.includes("/")) parsed = fractionInches(text);
  else if (/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) parsed = Number(text);
  else throw new Error("Ingresa pulgadas como decimal o fracción, por ejemplo 5 3/8.");
  const meters = convertUnits(feet, "pie", "m") + convertUnits(parsed, "pulgada", "m");
  return { meters, centimeters: convertUnits(meters, "m", "cm") };
}

export function metricToImperial(meters: number) {
  if (!Number.isFinite(meters) || meters < 0)
    throw new Error("Ingresa una medida en metros no negativa.");
  const inches = convertUnits(meters, "m", "pulgada");
  const hundredths = Math.round(inches * 100);
  const sixteenths = Math.round(inches * 16);
  if (!Number.isSafeInteger(hundredths) || !Number.isSafeInteger(sixteenths))
    throw new Error("La longitud convertida está fuera de rango.");

  const decimal = { feet: Math.floor(hundredths / 1200), inches: (hundredths % 1200) / 100 };
  const remainder = sixteenths % 192;
  const whole = Math.floor(remainder / 16);
  const numerator = remainder % 16;
  const divisor = [16, 8, 4, 2, 1].find((candidate) => numerator % candidate === 0) ?? 1;
  const fraction = numerator ? numerator / divisor + "/" + 16 / divisor : "";
  return {
    decimal,
    fractional: {
      feet: Math.floor(sixteenths / 192),
      inches: [whole || "", fraction].filter(Boolean).join(" ") || "0",
    },
  };
}
