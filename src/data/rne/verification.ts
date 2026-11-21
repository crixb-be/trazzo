import { RNE_CARDS } from "../seed-rne";
type SourceEvidence = { verified_at?: string | null; source_resolution?: string | null };

export function isVerifiedSource(source: SourceEvidence): boolean {
  return Boolean(source.verified_at && source.source_resolution);
}

/** Explicit gaps: a verification date must have supporting documentary evidence. */
export const RNE_VERIFICATION = RNE_CARDS.map((card) => ({
  slug: card.slug,
  norm: card.norm_code,
  article: card.article,
  resolution: card.source_resolution ?? null,
  verifiedAt: card.verified_at,
  status: isVerifiedSource(card) ? "verificado" : "pendiente",
  missing: [
    ...(!card.verified_at ? ["contraste del texto oficial"] : []),
    ...(!card.source_resolution ? ["resolución y versión aplicable"] : []),
  ],
}));
