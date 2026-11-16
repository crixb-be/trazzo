export const UNITS = {
  m: { group: "longitud", factor: 1 },
  cm: { group: "longitud", factor: 0.01 },
  mm: { group: "longitud", factor: 0.001 },
  pulgada: { group: "longitud", factor: 0.0254 },
  pie: { group: "longitud", factor: 0.3048 },
  m2: { group: "área", factor: 1 },
  ha: { group: "área", factor: 10000 },
  pie2: { group: "área", factor: 0.09290304 },
  m3: { group: "volumen", factor: 1 },
  litro: { group: "volumen", factor: 0.001 },
  galón_US: { group: "volumen", factor: 0.003785411784 },
  kg: { group: "masa", factor: 1 },
  tonelada: { group: "masa", factor: 1000 },
  libra: { group: "masa", factor: 0.45359237 },
} as const;
export type Unit = keyof typeof UNITS;
export function convertUnits(value: number, from: Unit, to: Unit): number {
  if (!Number.isFinite(value) || UNITS[from].group !== UNITS[to].group)
    throw new Error("Selecciona unidades compatibles y un valor finito.");
  const result = (value * UNITS[from].factor) / UNITS[to].factor;
  if (!Number.isFinite(result)) throw new Error("Valor fuera de rango.");
  return result;
}
export function fractionInches(value: string): number {
  const match = value.trim().match(/^(\d+)(?:\/(\d+))?$/);
  if (!match || (match[2] && +match[2] === 0)) throw new Error("Fracción inválida.");
  return +match[1] / (match[2] ? +match[2] : 1);
}
export function scalePlan(value: number, denominator: number, direction: "plano" | "real") {
  if (![value, denominator].every(Number.isFinite) || value < 0 || denominator <= 0)
    throw new Error("Longitud no negativa y escala positiva requeridas.");
  // Plano en cm, realidad en m.
  return direction === "real" ? (value * denominator) / 100 : (value * 100) / denominator;
}
