import { describe, expect, it } from "vitest";
import { expandColloquialQuery } from "./colloquial";
import { weightedTokens } from "./synonyms";

describe("colloquial → RNE expansion", () => {
  it("translates everyday wording to RNE terminology", () => {
    expect(expandColloquialQuery("baño de servicios").technicalTerms).toEqual(
      expect.arrayContaining(["servicios higiénicos", "cuarto de baño", "aparato sanitario"]),
    );
    expect(expandColloquialQuery("¿qué medida tiene?").technicalTerms).toEqual(
      expect.arrayContaining(["ancho mínimo", "altura libre", "vano", "área mínima"]),
    );
    expect(expandColloquialQuery("las gradas de mi casa").technicalTerms).toEqual(
      expect.arrayContaining(["paso", "contrapaso", "descanso", "ancho de tramo"]),
    );
  });

  it("builds an expanded query for embeddings and leaves technical queries alone", () => {
    expect(expandColloquialQuery("puerta").expandedQuery).toContain("términos RNE:");
    expect(expandColloquialQuery("A.130").expandedQuery).toBe("A.130");
  });

  it("matches whole words only", () => {
    expect(expandColloquialQuery("aguantar").technicalTerms).toEqual([]);
  });

  it("feeds the expansion into the weighted search tokens", () => {
    const tokens = weightedTokens("medida de puerta");
    expect(tokens.find((token) => token.token === "ancho minimo")?.weight).toBe(0.5);
    expect(tokens.find((token) => token.token === "puerta")?.original).toBe(true);
  });

  it("applies related terms for accented keys like baño", () => {
    expect(weightedTokens("baño").some((token) => token.token === "inodoro")).toBe(true);
  });
});
