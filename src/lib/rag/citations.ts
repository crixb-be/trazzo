import { RNE_CARDS } from "@/data/seed-rne";
import { normalize } from "@/lib/search/normalize";

export interface CitationSegment {
  text: string;
  citation: string | null;
  slug: string | null;
  href: string | null;
}

const NORM_CODES = [...new Set(RNE_CARDS.map((card) => card.norm_code))].sort(
  (left, right) => right.length - left.length,
);
const knownCodes = NORM_CODES.map((code) => code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
const CITATION_PATTERN = new RegExp(
  String.raw`\[((?:${knownCodes}|[A-Z]{1,3}\.\d{3})\s+[^\]]+)\]`,
  "g",
);

/** Separator between the norm reference and the card title in a citation. */
export const CITATION_TITLE_SEPARATOR = " · ";

/**
 * Card-specific citation, e.g. "[A.120 Art. 9 · Ancho de puerta accesible]".
 * Several cards share one article (A.120 Art. 9 covers ramps, doors, parking…),
 * so the title is what lets each citation link to the card actually used.
 */
export function citationForCard(card: {
  norm_code: string;
  article: string;
  title: string;
}): string {
  const articleShort = card.article.split(" - ")[0].trim();
  return `[${card.norm_code} ${articleShort}${CITATION_TITLE_SEPARATOR}${card.title}]`;
}

function findSlug(citation: string): string | null {
  const normCode = NORM_CODES.find(
    (code) => citation.startsWith(code) && /\s/.test(citation.charAt(code.length)),
  );
  if (!normCode) return null;

  const rest = citation.slice(normCode.length).trimStart();
  const separatorIndex = rest.indexOf(CITATION_TITLE_SEPARATOR.trim());

  // Card-specific form: match the title within the norm.
  if (separatorIndex >= 0) {
    const title = normalize(rest.slice(separatorIndex + 1));
    const byTitle = RNE_CARDS.find(
      (candidate) => candidate.norm_code === normCode && normalize(candidate.title) === title,
    );
    if (byTitle) return byTitle.slug;
  }

  // Legacy form "[A.120 Art. 9 - Accesibilidad]": first card of that article.
  const article = normalize(separatorIndex >= 0 ? rest.slice(0, separatorIndex) : rest);
  const card = RNE_CARDS.find(
    (candidate) =>
      candidate.norm_code === normCode &&
      (normalize(candidate.article) === article ||
        normalize(candidate.article).startsWith(article) ||
        article.startsWith(normalize(candidate.article))),
  );

  return card?.slug ?? null;
}

/** Splits assistant text into plain and linked normative citation segments. */
export function parseCitations(text: string): CitationSegment[] {
  const segments: CitationSegment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(CITATION_PATTERN)) {
    const start = match.index ?? 0;
    if (start > cursor) {
      segments.push({
        text: text.slice(cursor, start),
        citation: null,
        slug: null,
        href: null,
      });
    }

    const citation = match[1];
    const slug = findSlug(citation);
    segments.push({
      text: "[" + citation + "]",
      citation,
      slug,
      href: slug ? "/normativa/" + slug : null,
    });
    cursor = start + match[0].length;
  }

  if (cursor < text.length || segments.length === 0) {
    segments.push({
      text: text.slice(cursor),
      citation: null,
      slug: null,
      href: null,
    });
  }

  return segments;
}
