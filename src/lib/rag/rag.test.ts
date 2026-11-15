import { describe, expect, it } from "vitest";
import { RNE_CARDS } from "@/data/seed-rne";
import { citationForCard, parseCitations } from "./citations";
import { buildLocalAnswer, buildSystemPrompt } from "./prompt";
import { retrieveLocal } from "./retrieve";

const CITATION = /\[[A-Z]{1,3}\.\d{3}\s+[^\]]+\]/g;

describe("local RAG", () => {
  it("keeps the extractive answer to the clearly relevant cards", () => {
    const chunks = retrieveLocal("ancho de puerta de baño", "extractive");
    expect(chunks.length).toBeLessThanOrEqual(3);
    expect(chunks[0]?.slug).toBe("puerta-accesible-ancho");
    expect(
      chunks.some((chunk) => chunk.slug.includes("rampa") || chunk.slug.includes("agua")),
    ).toBe(false);
  });

  it("gives the model width, height and accessibility for an everyday door question", () => {
    const slugs = retrieveLocal("¿cuánto debe medir la puerta del baño?", "synthesis").map(
      (chunk) => chunk.slug,
    );
    expect(slugs.length).toBeGreaterThanOrEqual(3);
    expect(slugs.length).toBeLessThanOrEqual(6);
    expect(slugs).toContain("puerta-accesible-ancho");
    expect(slugs).toContain("vano-puerta-altura");
  });

  it("builds a cited local answer with the reference value", () => {
    const chunks = retrieveLocal("ancho de puerta de baño").slice(0, 1);
    const answer = buildLocalAnswer("ancho de puerta de baño", chunks);
    expect(answer.match(CITATION)?.length).toBe(1);
    expect(answer.length).toBeLessThan(600);
    expect(answer).toContain(String(chunks[0]?.card?.min_value));
  });

  it("lists every related card with its own citation in the local answer", () => {
    const chunks = retrieveLocal("medida de puerta", "extractive");
    const answer = buildLocalAnswer("medida de puerta", chunks);
    expect(chunks.length).toBeGreaterThan(1);
    expect(answer.match(CITATION)?.length).toBe(chunks.length);
    expect(answer).toContain("**También aplica:**");
  });

  it("puts the technical terms and exact citations in the system prompt", () => {
    const chunks = retrieveLocal("medida de puerta", "synthesis");
    const prompt = buildSystemPrompt(chunks, ["ancho mínimo", "altura libre"]);
    expect(prompt).toContain("ancho mínimo, altura libre");
    for (const chunk of chunks) expect(prompt).toContain(`Cita exacta: ${chunk.citation}`);
  });
});

describe("card-specific citations", () => {
  it("links each A.120 Art. 9 citation to its own card", () => {
    const shared = RNE_CARDS.filter((card) => card.article.startsWith("Art. 9"));
    expect(shared.length).toBeGreaterThan(1);
    for (const card of shared) {
      const [segment] = parseCitations(citationForCard(card));
      expect(segment.href).toBe(`/normativa/${card.slug}`);
    }
  });

  it("still resolves the legacy article-only format", () => {
    const [segment] = parseCitations("[A.010 Cap. VI - Vanos]");
    expect(segment.href).toBe("/normativa/vano-puerta-altura");
  });
});
