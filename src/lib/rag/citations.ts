import { RNE_CARDS } from "@/data/seed-rne";
import { normalize } from "@/lib/search/normalize";

export interface CitationSegment {
  text: string;
  citation: string | null;
  slug: string | null;
  href: string | null;
}

const CITATION_PATTERN = /\[([A-Z]{1,3}\.\d{3}\s+[^\]]+)\]/g;

function findSlug(citation: string): string | null {
  const firstSpace = citation.indexOf(" ");
  if (firstSpace < 0) return null;

  const normCode = citation.slice(0, firstSpace);
  const article = normalize(citation.slice(firstSpace + 1));
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
