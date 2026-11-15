import type { RneCard } from "@/data/seed-rne";
import { normalize } from "./normalize";

/**
 * Building elements a question can be about. Words like "baño" or "cocina"
 * are places, not elements: in "puerta de baño de servicio" the subject is
 * the door, so a "pozo de luz para servicios" card must not be used.
 */
export interface ElementFamily {
  id: string;
  /** Words that name the element in a query (normalized match, whole words). */
  queryTerms: string[];
  /** Words that identify a card about the element (title and keywords). */
  cardTerms: string[];
}

export const ELEMENT_FAMILIES: ElementFamily[] = [
  {
    id: "puerta",
    queryTerms: ["puerta", "puertas", "vano", "vanos", "ingreso", "mampara"],
    cardTerms: ["puerta", "vano"],
  },
  {
    id: "ventana",
    queryTerms: ["ventana", "ventanas", "alfeizar", "antepecho"],
    cardTerms: ["ventana", "alfeizar", "antepecho"],
  },
  {
    id: "escalera",
    queryTerms: ["escalera", "escaleras", "grada", "gradas", "peldaño", "contrapaso", "huella"],
    cardTerms: ["escalera", "contrapaso", "peldaño"],
  },
  {
    id: "rampa",
    queryTerms: ["rampa", "rampas"],
    cardTerms: ["rampa"],
  },
  {
    id: "pozo-luz",
    queryTerms: ["pozo de luz", "pozos de luz", "ducto", "patio de luz"],
    cardTerms: ["pozo de luz", "ducto"],
  },
  {
    id: "estacionamiento",
    queryTerms: ["estacionamiento", "estacionamientos", "cochera", "cocheras", "parqueo", "garaje"],
    cardTerms: ["estacionamiento", "cochera"],
  },
  {
    id: "agua",
    queryTerms: ["dotacion", "cisterna", "tanque", "agua"],
    cardTerms: ["dotacion", "agua"],
  },
  {
    id: "evacuacion",
    queryTerms: ["evacuacion", "salida de emergencia", "ruta de escape", "aforo"],
    cardTerms: ["evacuacion", "recorrido", "ocupante"],
  },
];

function containsTerm(text: string, term: string): boolean {
  const normalizedTerm = normalize(term);
  return normalizedTerm.length > 0 && ` ${text} `.includes(` ${normalizedTerm} `);
}

/** Elements the query names explicitly (empty when it names none). */
export function queryElements(query: string): ElementFamily[] {
  const text = normalize(query);
  return ELEMENT_FAMILIES.filter((family) =>
    family.queryTerms.some((term) => containsTerm(text, term)),
  );
}

function cardText(card: RneCard): string {
  return normalize([card.title, ...card.keywords].join(" "));
}

export function cardMatchesElements(card: RneCard, families: ElementFamily[]): boolean {
  const text = cardText(card);
  return families.some((family) => family.cardTerms.some((term) => containsTerm(text, term)));
}

/**
 * Keeps only the cards about the element the user asked for. If the query
 * names no element, or nothing would survive, the list is returned unchanged.
 */
export function filterBySubject<T extends { card?: RneCard }>(query: string, items: T[]): T[] {
  const families = queryElements(query);
  if (families.length === 0) return items;
  const kept = items.filter((item) => !item.card || cardMatchesElements(item.card, families));
  return kept.length > 0 ? kept : items;
}
