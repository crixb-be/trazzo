import { describe, expect, it } from "vitest";
import { RNE_CARDS } from "@/data/seed-rne";
import { buildLocalAnswer, buildSystemPrompt, STRICT_SYSTEM_PROMPT } from "@/lib/rag/prompt";
import { retrieveLocal } from "@/lib/rag/retrieve";
import { filterBySubject, queryElements } from "./subject";

const slugs = (query: string, mode: "synthesis" | "extractive") =>
  retrieveLocal(query, mode).map((chunk) => chunk.slug);

describe("main element of the query", () => {
  it("treats the door as the subject and the bathroom as its location", () => {
    expect(queryElements("ancho de puerta de baño de servicio").map((f) => f.id)).toEqual([
      "puerta",
    ]);
    expect(queryElements("baño de servicios")).toEqual([]);
  });

  it("drops light-well cards when the question is about a bathroom door", () => {
    for (const mode of ["synthesis", "extractive"] as const) {
      const result = slugs("ancho de puerta de baño de servicio", mode);
      expect(result).not.toContain("pozo-luz-servicios");
      expect(result).toContain("puerta-ancho-minimo");
    }
  });

  it("gives standard width (A.010), accessible width (A.120) and height together", () => {
    const result = slugs("¿cuánto debe medir la puerta del baño?", "extractive");
    expect(result).toEqual(
      expect.arrayContaining([
        "puerta-ancho-minimo",
        "puerta-accesible-ancho",
        "vano-puerta-altura",
      ]),
    );
  });

  it("keeps the list unchanged when no element is named or nothing would remain", () => {
    const items = [{ card: RNE_CARDS.find((card) => card.slug === "pozo-luz-servicios") }];
    expect(filterBySubject("baño de servicios", items)).toBe(items);
    expect(filterBySubject("puerta", items)).toBe(items);
  });
});

describe("door width card (A.020 Art.12.2.b)", () => {
  const card = RNE_CARDS.find((item) => item.slug === "puerta-ancho-minimo");

  it("lists 0.90 / 0.80 / 0.70 m and separates the A.120 accessible case", () => {
    expect(card?.norm_code).toBe("A.020");
    expect(card?.summary).toContain("0.90 m");
    expect(card?.summary).toContain("0.80 m");
    expect(card?.summary).toContain("0.70 m");
    expect(card?.body).toContain("A.120");
  });

  it("appears in the local answer with its own citation", () => {
    const query = "ancho de puerta de baño de servicio";
    const answer = buildLocalAnswer(query, retrieveLocal(query, "extractive"));
    expect(answer).toContain("[A.020 Art. 12.2.b · Ancho mínimo de puertas según ambiente]");
    expect(answer).not.toContain("Pozo de luz");
  });
});

describe("strict system prompt", () => {
  it("leads the model prompt", () => {
    const prompt = buildSystemPrompt(retrieveLocal("medida de puerta", "synthesis"));
    expect(prompt.startsWith(STRICT_SYSTEM_PROMPT)).toBe(true);
    expect(prompt).toContain("ancho de vivienda (A.020), ancho accesible (A.120) y altura mínima");
  });
});
