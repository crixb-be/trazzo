import { normalize, tokenize } from "./normalize";

export const SYNONYM_GROUPS: string[][] = [
  ["contrapaso", "garganta", "peldaño", "paso", "huella", "escalera"],
  ["vano", "puerta", "ventana", "dintel", "marco"],
  ["alfeizar", "antepecho", "ventana"],
  ["pozo de luz", "ducto", "iluminación", "ventilación", "patio"],
  ["falso piso", "contrapiso", "piso terminado"],
  ["rampa", "accesibilidad", "pendiente", "itinerario accesible"],
  ["discapacitado", "persona con discapacidad", "silla de ruedas", "conadis"],
  ["cochera", "parqueo", "estacionamiento", "cajón"],
  ["salida", "evacuación", "escape", "ruta de evacuación", "seguridad"],
  ["agua", "cisterna", "tanque", "dotación", "sanitaria", "sanitarias"],
  ["meseta", "descanso", "landing"],
  ["aforo", "ocupante", "capacidad"],
  ["losa", "techo", "vigueta", "aligerada"],
];

export const RELATED_TERMS: Record<string, string[]> = {
  baño: [
    "servicios higienicos",
    "ss.hh",
    "inodoro",
    "lavatorio",
    "aparatos sanitarios",
    "accesibilidad",
    "giro",
    "silla de ruedas",
    "ventilacion",
    "servicios",
  ],
  "ss.hh": [
    "baño",
    "servicios higienicos",
    "inodoro",
    "lavatorio",
    "aparatos sanitarios",
    "servicios",
  ],
  "servicios higienicos": [
    "baño",
    "ss.hh",
    "inodoro",
    "lavatorio",
    "aparatos sanitarios",
    "accesibilidad",
    "giro",
    "silla de ruedas",
    "ventilacion",
    "servicios",
  ],
  vano: ["puerta", "ventana", "alfeizar", "dintel"],
  puerta: ["vano", "ancho libre"],
  ventana: ["vano", "alfeizar", "iluminacion"],
  cocina: ["servicios", "ventilacion", "pozo de luz"],
  escalera: ["contrapaso", "paso", "huella", "tramo"],
  rampa: ["pendiente", "accesibilidad", "descanso"],
  cochera: ["estacionamiento"],
  aforo: ["ocupante", "evacuacion"],
  tanque: ["dotacion", "agua"],
  cisterna: ["dotacion", "agua"],
};

export interface WeightedToken {
  token: string;
  weight: number;
  original: boolean;
}

function addToken(
  map: Map<string, WeightedToken>,
  token: string,
  weight: number,
  original: boolean,
): void {
  const normalized = normalize(token);
  if (!normalized) return;
  const current = map.get(normalized);
  if (!current || weight > current.weight || (original && !current.original)) {
    map.set(normalized, {
      token: normalized,
      weight,
      original: original || current?.original === true,
    });
  }
}

function phraseMatches(tokens: string[], start: number, phrase: string): boolean {
  const phraseTokens = tokenize(phrase, true);
  return (
    phraseTokens.length > 0 && phraseTokens.every((token, index) => tokens[start + index] === token)
  );
}

function termsForQuery(queryTokens: string[]): string[] {
  const terms = new Set<string>(queryTokens);
  for (const phrase of [...Object.keys(RELATED_TERMS), ...SYNONYM_GROUPS.flat()]) {
    if (
      phrase.includes(" ") &&
      queryTokens.some((_, index) => phraseMatches(queryTokens, index, phrase))
    ) {
      terms.add(phrase);
    }
  }
  return [...terms];
}

export function weightedTokens(query: string): WeightedToken[] {
  const tokens = tokenize(query, true);
  if (tokens.length === 0) return [];

  const output = new Map<string, WeightedToken>();
  for (const token of tokens) addToken(output, token, 1, true);

  const normalizedGroups = SYNONYM_GROUPS.map((group) => group.map(normalize));
  for (const term of termsForQuery(tokens)) {
    for (const group of normalizedGroups) {
      if (!group.includes(term)) continue;
      for (const synonym of group) {
        if (synonym !== term) addToken(output, synonym, 0.6, false);
      }
    }
    for (const related of RELATED_TERMS[term] ?? []) addToken(output, related, 0.35, false);
  }

  return [...output.values()];
}

export function expandedTokens(query: string): string[] {
  return weightedTokens(query).map(({ token }) => token);
}
