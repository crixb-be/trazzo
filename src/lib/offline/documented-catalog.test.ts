import { it, expect } from "vitest";
import { documentedCatalog, catalogRow } from "./documented-catalog";
import { RNE_CARDS } from "@/data/seed-rne";
it("la nube antigua no restaura tablas derogadas", () => {
  const source = RNE_CARDS.find((c) => c.slug === "rampa-pendiente-maxima")!;
  const remote = { ...source, body: "12% hasta0.25m", verified_at: null, source_sha256: undefined };
  const merged = documentedCatalog([remote]);
  expect(merged.find((c) => c.slug === source.slug)?.body).toBe(source.body);
  expect(
    documentedCatalog([{ ...remote, slug: "sin-fuente" }]).some((c) => c.slug === "sin-fuente"),
  ).toBe(false);
});
it("el seed solo envía columnas del esquema existente y conserva evidencia en nota", () => {
  const row = catalogRow(RNE_CARDS[0]);
  expect(row).not.toHaveProperty("source_document");
  expect(row).not.toHaveProperty("source_resolution");
  expect(row.legal_note).toContain(RNE_CARDS[0].source_sha256);
});
