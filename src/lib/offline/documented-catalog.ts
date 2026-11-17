import { RNE_CARDS, type RneCard } from "@/data/seed-rne";
import documents from "@/data/rne/documents.json";
/** Una fila remota antigua nunca puede reemplazar una ficha contrastada empaquetada. */
export function documentedCatalog(remote: RneCard[]): RneCard[] {
  const bySlug = new Map<string, RneCard>();
  for (const c of remote) {
    if (
      c.verified_at &&
      c.source_sha256 &&
      documents.some(
        (d) =>
          d.category === "RNE obligatorio" &&
          d.file === c.source_document &&
          d.sha256 === c.source_sha256,
      )
    )
      bySlug.set(c.slug, c);
  }
  for (const c of RNE_CARDS) bySlug.set(c.slug, c);
  return [...bySlug.values()];
}
/** Proyección explícita al esquema SQL existente: trazabilidad completa en legal_note, sin columnas inexistentes. */
export function catalogRow(c: RneCard) {
  const { source_resolution, source_document, source_sha256, source_page, ...row } = c;
  return {
    ...row,
    legal_note: `${c.legal_note}\nFuente: ${source_document}; página PDF ${source_page}; ${source_resolution}; SHA-256 ${source_sha256}.`,
  };
}
