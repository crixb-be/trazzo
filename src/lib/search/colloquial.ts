import { normalize } from "./normalize";

/**
 * Everyday Peruvian phrasing → RNE terminology. Patterns are matched on the
 * normalized query (no accents, lowercase) as whole words or phrases.
 */
export interface ColloquialRule {
  patterns: string[];
  technical: string[];
}

export const COLLOQUIAL_RULES: ColloquialRule[] = [
  {
    patterns: ["baño", "baños", "baño de servicio", "baño de servicios", "ss.hh", "ss hh", "wc"],
    technical: [
      "baño",
      "servicios higiénicos",
      "cuarto de baño",
      "aparato sanitario",
      "ventilación de servicios",
      "accesibilidad",
    ],
  },
  {
    patterns: [
      "medida",
      "medidas",
      "tamaño",
      "dimension",
      "dimensiones",
      "cuanto mide",
      "cuanto debe medir",
      "que tan ancho",
      "que tan alto",
      "grande",
    ],
    technical: ["ancho mínimo", "altura libre", "vano", "área mínima"],
  },
  {
    patterns: ["escalera", "escaleras", "grada", "gradas", "escalon", "escalones"],
    technical: ["paso", "contrapaso", "descanso", "ancho de tramo"],
  },
  {
    patterns: ["puerta", "puertas", "entrada", "acceso"],
    technical: ["vano", "ancho libre", "altura de vano", "puerta accesible"],
  },
  {
    patterns: ["rampa", "rampas", "subida", "bajada"],
    technical: ["pendiente", "descanso", "ancho de rampa", "accesibilidad"],
  },
  {
    patterns: ["silla de ruedas", "discapacitado", "discapacidad", "minusvalido", "inclusivo"],
    technical: ["accesibilidad", "giro de silla de ruedas", "puerta accesible"],
  },
  {
    patterns: ["cochera", "cocheras", "parqueo", "parqueadero", "garaje", "garage"],
    technical: ["estacionamiento", "estacionamiento accesible"],
  },
  {
    patterns: ["tanque", "cisterna", "agua", "litros"],
    technical: ["dotación de agua", "instalaciones sanitarias"],
  },
  {
    patterns: ["patio", "ducto", "luz natural", "ventilar", "ventilacion"],
    technical: ["pozo de luz", "iluminación", "ventilación"],
  },
  {
    patterns: ["salida", "emergencia", "escape", "incendio", "evacuar"],
    technical: ["evacuación", "ancho de evacuación", "distancia de recorrido"],
  },
  {
    patterns: ["altura del techo", "piso a techo", "alto del techo", "techo bajo"],
    technical: ["altura libre", "altura mínima"],
  },
  {
    patterns: ["ventana", "ventanas"],
    technical: ["vano", "alféizar", "iluminación"],
  },
];

function containsPhrase(normalizedQuery: string, phrase: string): boolean {
  const normalizedPhrase = normalize(phrase);
  if (!normalizedPhrase) return false;
  return ` ${normalizedQuery} `.includes(` ${normalizedPhrase} `);
}

export interface ColloquialExpansion {
  /** RNE terms implied by the everyday wording, without duplicates. */
  technicalTerms: string[];
  /** Original query plus the technical terms, for embeddings and the model prompt. */
  expandedQuery: string;
}

export function expandColloquialQuery(query: string): ColloquialExpansion {
  const normalizedQuery = normalize(query);
  const terms = new Set<string>();
  for (const rule of COLLOQUIAL_RULES) {
    if (rule.patterns.some((pattern) => containsPhrase(normalizedQuery, pattern))) {
      for (const term of rule.technical) terms.add(term);
    }
  }
  const technicalTerms = [...terms];
  return {
    technicalTerms,
    expandedQuery: technicalTerms.length
      ? `${query.trim()} (términos RNE: ${technicalTerms.join(", ")})`
      : query.trim(),
  };
}
