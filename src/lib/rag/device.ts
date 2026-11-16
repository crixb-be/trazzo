import { searchCardsScored } from "@/lib/search/search";
import { filterBySubject } from "@/lib/search/subject";
import { citationForCard } from "./citations";
import { buildLocalAnswer } from "./prompt";
import type { RneCard } from "@/data/seed-rne";
export function deviceAnswer(query: string, cards: RneCard[]) {
  const scored = filterBySubject(query, searchCardsScored(cards, query));
  const top = scored[0]?.score ?? 0;
  const chunks =
    top < 1.5
      ? []
      : scored
          .filter((r, i) => i === 0 || r.score >= top * 0.45)
          .slice(0, 3)
          .map(({ card }) => ({
            slug: card.slug,
            normCode: card.norm_code,
            article: card.article,
            text: card.body,
            citation: citationForCard(card),
            card,
          }));
  return (
    buildLocalAnswer(query, chunks) +
    (chunks.some((c) => !c.card.verified_at)
      ? "\n\nLas fichas consultadas están por verificar."
      : "")
  );
}
export function calculatorForCard(slug: string): string | null {
  if (/escaler|contrapaso/.test(slug)) return "escaleras";
  if (/rampa/.test(slug)) return "rampas";
  if (/agua|dotacion/.test(slug)) return "agua";
  if (/pozo/.test(slug)) return "pozos";
  if (/estacionamiento/.test(slug)) return "parking";
  if (/aforo/.test(slug)) return "aforo";
  if (/sanitario/.test(slug)) return "sanitarios";
  if (/evacuacion|seguridad/.test(slug)) return "evacuacion";
  return null;
}
