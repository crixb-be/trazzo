import { normalize, tokenize } from "./normalize";

const SYNONYM_GROUPS: string[][] = [
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
  ["baño", "servicios higiénicos", "servicios"],
];

export const SYNONYMS: Record<string, string[]> = {};

for (const group of SYNONYM_GROUPS) {
  const normalizedGroup = group.map(normalize);
  for (const term of normalizedGroup) {
    SYNONYMS[term] = normalizedGroup.filter((candidate) => candidate !== term);
  }
}

function matchingPhrase(tokens: string[], index: number, phrase: string): boolean {
  const phraseTokens = tokenize(phrase);
  return phraseTokens.every((token, phraseIndex) => tokens[index + phraseIndex] === token);
}

/**
 * Expands user jargon in both directions, retaining the original terms.
 * Multiword terms are kept as phrases and also contribute their individual tokens.
 */
export function expandedTokens(query: string): string[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [];

  const queryTokens = tokenize(normalizedQuery);
  const output = new Set<string>();

  for (let index = 0; index < queryTokens.length; index += 1) {
    const token = queryTokens[index];
    output.add(token);

    for (const phrase of Object.keys(SYNONYMS)) {
      if (!phrase.includes(" ") || !matchingPhrase(queryTokens, index, phrase)) continue;
      output.add(phrase);
      for (const phraseToken of tokenize(phrase)) output.add(phraseToken);
      for (const synonym of SYNONYMS[phrase]) {
        output.add(synonym);
        for (const synonymToken of tokenize(synonym)) output.add(synonymToken);
      }
    }

    for (const synonym of SYNONYMS[token] ?? []) {
      output.add(synonym);
      for (const synonymToken of tokenize(synonym)) output.add(synonymToken);
    }
  }

  return [...output];
}
