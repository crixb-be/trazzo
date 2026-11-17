import { MEASURES } from "@/data/medidas";
import type { RneCard } from "@/data/seed-rne";
import type { Project, FeeQuote } from "@/lib/offline/db";
import { normalize } from "./normalize";
import { searchCardsScored } from "./search";
export interface SearchEntry {
  id: string;
  title: string;
  kind: string;
  href: string;
  terms: string;
}
export const TOOL_CATALOG = [
  ["sismo", "Sismo E.030-2026"],
  ["escaleras", "Escaleras"],
  ["rampas", "Rampas"],
  ["agua", "Dotación de agua"],
  ["pozos", "Pozos de luz"],
  ["evacuacion", "Evacuación"],
  [
    "materiales",
    "Materiales concreto ladrillo tarrajeo contrapiso cerámico porcelanato pintura acero losa",
  ],
  ["utilidades", "Utilidades conversor unidades pendientes área terreno escala pulgadas"],
  ["cabida", "Cabida de terreno"],
  ["aforo", "Aforo por uso"],
  ["sanitarios", "Aparatos sanitarios"],
  ["luz", "Iluminación y ventilación natural"],
  ["parking", "Estacionamientos accesibles"],
] as const;
export function searchCatalog(
  query: string,
  cards: RneCard[],
  projects: Project[],
  quotes: FeeQuote[],
): SearchEntry[] {
  if (!query.trim()) return [];
  const entries: SearchEntry[] = [
    ...cards.map((c) => ({
      id: "f:" + c.slug,
      title: c.title,
      kind: "RNE · " + c.norm_code,
      href: "/normativa/" + c.slug,
      terms: [c.article, c.summary, ...c.keywords].join(" "),
    })),
    ...MEASURES.map((m) => ({
      id: "m:" + m.id,
      title: m.title,
      kind: m.source ? "Ref. internacional" : "Plantilla TRAZZO",
      href: "/medidas?q=" + encodeURIComponent(m.title),
      terms: m.category + " " + m.note,
    })),
    ...TOOL_CATALOG.map(([id, title]) => ({
      id: "c:" + id,
      title,
      kind: "Calculadora",
      href: "/calculadoras?tab=" + id,
      terms: "herramienta",
    })),
    {
      id: "biblioteca",
      title: "Biblioteca documental RNE Neufert Ching",
      kind: "Fuentes",
      href: "/biblioteca",
      terms: "artículos seguridad antropometría teoría normativa",
    },
    {
      id: "matriz",
      title: "Matriz de relaciones",
      kind: "Herramienta",
      href: "/matriz",
      terms: "programación arquitectónica ambientes",
    },
    ...projects.map((p) => ({
      id: "p:" + p.id,
      title: p.name,
      kind: "Proyecto",
      href: "/metrados?project=" + encodeURIComponent(p.id),
      terms: p.location + " " + p.typology,
    })),
    ...quotes.map((q) => ({
      id: "q:" + q.id,
      title: q.code + " · " + q.projectName,
      kind: "Cotización",
      href: "/honorarios?quote=" + encodeURIComponent(q.id),
      terms: q.clientName + " " + q.location,
    })),
  ];
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const cardScores = new Map(
    searchCardsScored(cards, query).map((r) => ["f:" + r.card.slug, r.score]),
  );
  return entries
    .map((e) => {
      const title = normalize(e.title),
        all = normalize(e.title + " " + e.kind + " " + e.terms);
      const direct = terms.every((t) => all.includes(t));
      return {
        e,
        score: direct
          ? 100 + (title.includes(normalize(query)) ? 30 : 0)
          : (cardScores.get(e.id) ?? 0),
      };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.e.title.localeCompare(b.e.title))
    .slice(0, 12)
    .map((r) => r.e);
}
