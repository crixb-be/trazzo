import { FIELD_EXTRA_TOOLS } from "@/lib/calculators/field-extra";
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
  ...FIELD_EXTRA_TOOLS.map(({ id, label }) => [id, label] as const),
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
      kind: c.norm_code,
      href: "/normativa/" + c.slug,
      terms: [c.article, c.summary, ...c.keywords].join(" "),
    })),
    ...MEASURES.map((m) => ({
      id: "m:" + m.id,
      title: m.title,
      kind: "Medidas de bolsillo",
      href: "/normativa?tab=medidas&q=" + encodeURIComponent(m.title),
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
      id: "matriz",
      title: "Matriz de relaciones",
      kind: "Estudio",
      href: "/matriz",
      terms: "programación arquitectónica ambientes",
    },
    {
      id: "bitacora",
      title: "Bitácora de obra",
      kind: "Herramienta",
      href: "/bitacora",
      terms: "bitacora visita obra acta hallazgos residente supervisor",
    },
    {
      id: "proyectos",
      title: "Proyectos de obra",
      kind: "Herramienta",
      href: "/metrados",
      terms: "metrados presupuesto expediente partidas",
    },
    {
      id: "honorarios",
      title: "Honorarios y propuestas",
      kind: "Estudio",
      href: "/honorarios",
      terms: "cotización servicios profesionales",
    },
    ...projects.map((p) => ({
      id: "p:" + p.id,
      title: p.name,
      kind: "Proyecto",
      href: "/metrados?project=" + encodeURIComponent(p.id),
      terms: [p.location, p.typology, p.client].join(" "),
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
