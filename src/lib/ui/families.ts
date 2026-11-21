/**
 * Colour families of TRAZZO (tokens in src/styles/families.css):
 * arena = normativa and circulation, salvia = design and accessibility,
 * pizarra = calculation and sanitary, terracota = safety and site work,
 * piedra = everything else.
 */
export type Family = "arena" | "salvia" | "pizarra" | "terracota" | "piedra";

/** RNE disciplines share the families of the tools that use them. */
export const DISCIPLINE_FAMILY: Record<string, Family> = {
  Accesibilidad: "salvia",
  Circulación: "arena",
  Seguridad: "terracota",
  Sanitarias: "pizarra",
  Estacionamientos: "piedra",
  Salud: "salvia",
  Educación: "pizarra",
  "Servicios Comunales": "arena",
};

/** Pocket-measure categories. */
export const MEASURE_FAMILY: Record<string, Family> = {
  Antropometría: "salvia",
  Ambientes: "arena",
  Mobiliario: "piedra",
  Montaje: "pizarra",
  Salud: "salvia",
  Educación: "pizarra",
  "Servicios Comunales": "arena",
};

export function familyOf(map: Record<string, Family>, key: string): Family {
  return map[key] ?? "piedra";
}
