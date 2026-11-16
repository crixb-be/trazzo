export const YIELD_DATE = "2026-11-16";
export const CONCRETE_RECIPES: Record<string, { bags: number; sand: number; stone: number }> = {
  "175": { bags: 7.5, sand: 0.54, stone: 0.55 },
  "210": { bags: 8.5, sand: 0.52, stone: 0.53 },
  "280": { bags: 10, sand: 0.5, stone: 0.5 },
};
export const MATERIAL_MODES = {
  concreto: "Concreto por resistencia",
  muro: "Muro de ladrillo",
  tarrajeo: "Tarrajeo",
  contrapiso: "Contrapiso",
  ceramico: "Cerámico",
  porcelanato: "Porcelanato",
  pintura: "Pintura",
  acero: "Acero kg ↔ varillas",
  losa: "Losa aligerada",
};
export type MaterialMode = keyof typeof MATERIAL_MODES;
export const DEFAULT_MATERIAL_INPUT = {
  area: 10,
  volume: 1,
  thickness: 0.015,
  waste: 5,
  bags: 8.5,
  sand: 0.52,
  stone: 0.53,
  brickLength: 0.24,
  brickWidth: 0.13,
  brickHeight: 0.09,
  joint: 0.015,
  bond: 0,
  mortarRatio: 5,
  dryFactor: 1.33,
  tileLength: 0.45,
  tileWidth: 0.45,
  adhesive: 4,
  bagKg: 25,
  coverage: 30,
  coats: 2,
  diameter: 9.525,
  barLength: 9,
  steelQuantity: 100,
  steelDirection: 0,
  concretePerM2: 0.09,
  roofBricks: 8,
};
export type MaterialInput = typeof DEFAULT_MATERIAL_INPUT;
