import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { RNE_CARDS } from "../seed-rne";
import documents from "./documents.json";
import articles from "./a130-articles.json";
it("cada ficha contrastada identifica PDF real sin referencias provisionales", () => {
  for (const c of RNE_CARDS) {
    expect(c.verified_at).toBe("2026-11-17");
    expect(c.article).not.toMatch(/pendiente/i);
    const d = documents.find((d) => d.file === c.source_document);
    expect(d).toBeDefined();
    expect(c.source_sha256).toBe(d?.sha256);
    expect(c.source_page).toBeGreaterThan(0);
    expect(c.source_page).toBeLessThanOrEqual(Number(d?.pages));
  }
});
it("el manifiesto coincide con los18 PDFs normativos y2libros", () => {
  expect(documents.filter((d) => d.category === "RNE obligatorio")).toHaveLength(18);
  expect(documents.filter((d) => d.category !== "RNE obligatorio")).toHaveLength(2);
  for (const d of documents) {
    expect(createHash("sha256").update(readFileSync(d.file)).digest("hex")).toBe(d.sha256);
  }
});
it("A.130 conserva218 artículos sin saltos ni falsos encabezados por referencias cruzadas", () => {
  expect(articles.map((a) => a.article)).toEqual(Array.from({ length: 218 }, (_, i) => i + 1));
  expect(articles.find((a) => a.article === 22)?.text).toContain("0.005");
  expect(articles.find((a) => a.article === 26)?.text).toContain("45.0");
});
it("se retiraron reglas derogadas de fichas residenciales y accesibles", () => {
  expect(RNE_CARDS.find((c) => c.slug === "puerta-accesible-ancho")?.min_value).toBe(1);
  expect(RNE_CARDS.find((c) => c.slug === "estacionamiento-accesible")?.min_value).toBe(3.7);
  expect(RNE_CARDS.find((c) => c.slug === "dotacion-agua-multifamiliar")?.body).not.toContain(
    "850 L",
  );
  expect(RNE_CARDS.some((c) => ["E.020", "E.060"].includes(c.norm_code))).toBe(false);
});
