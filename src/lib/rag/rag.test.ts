import { describe, expect, it } from "vitest";
import { buildLocalAnswer } from "./prompt";
import { retrieveLocal } from "./retrieve";

describe("local RAG", () => {
  it("retrieves the door card first and limits related cards", () => {
    const chunks = retrieveLocal("ancho de puerta de baño");
    expect(chunks.length).toBeLessThanOrEqual(2);
    expect(chunks[0]?.slug).toBe("puerta-accesible-ancho");
    expect(
      chunks.some((chunk) => chunk.slug.includes("rampa") || chunk.slug.includes("agua")),
    ).toBe(false);
  });

  it("builds a short cited local answer", () => {
    const chunks = retrieveLocal("ancho de puerta de baño").slice(0, 1);
    const answer = buildLocalAnswer("ancho de puerta de baño", chunks);
    expect(answer.match(/\[[A-Z]{1,3}\.\d{3}\s+[^\]]+\]/g)?.length).toBe(1);
    expect(answer.length).toBeLessThan(600);
    expect(answer).toContain(String(chunks[0]?.card?.min_value));
  });
});
