import { RNE_CARDS } from "../seed-rne";
/** Explicit gaps: a verification date must have supporting documentary evidence. */
export const RNE_VERIFICATION = RNE_CARDS.map((card) => ({
  slug: card.slug,
  norm: card.norm_code,
  article: card.article,
  document: card.source_document,
  page: card.source_page,
  sha256: card.source_sha256,
  resolution: card.source_resolution ?? null,
  verifiedAt: card.verified_at,
  status: card.verified_at && card.source_resolution ? "contrastado con PDF" : "pendiente",
  missing: [
    ...(!card.verified_at ? ["contraste del texto oficial"] : []),
    ...(!/^(RM|DS|D\.S\.)\s/.test(card.source_resolution ?? "")
      ? ["resolución y versión aplicable"]
      : []),
  ],
}));
