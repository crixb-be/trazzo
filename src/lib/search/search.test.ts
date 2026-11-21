import { describe, expect, it } from "vitest";
import { RNE_CARDS } from "@/data/seed-rne";
import { retrieveLocal } from "@/lib/rag/retrieve";
import { normalize } from "./normalize";
import { searchCards } from "./search";

describe("tolerant RNE search", () => {
  it("removes accents and punctuation", () => {
    expect(normalize("Alféizar / ÁREA")).toBe("alfeizar area");
  });

  it("finds jargon for stairs", () => {
    expect(searchCards(RNE_CARDS, "garganta")[0].slug).toContain("escalera");
  });

  it("finds jargon for parking", () => {
    expect(searchCards(RNE_CARDS, "cochera")[0].slug).toBe("estacionamiento-accesible");
  });

  it("finds the light well from its phrase", () => {
    expect(searchCards(RNE_CARDS, "pozo de luz")[0].slug).toContain("pozo-luz");
  });

  it("matches a normalized norm code", () => {
    expect(searchCards(RNE_CARDS, "A.120").length).toBeGreaterThan(0);
    expect(searchCards(RNE_CARDS, "A.120")[0].norm_code).toBe("A.120");
  });

  it("tolerates one typo for long tokens", () => {
    expect(searchCards(RNE_CARDS, "escalrea")[0].slug).toContain("escalera");
  });

  it("matches a prefix", () => {
    expect(searchCards(RNE_CARDS, "contrapa")[0].slug).toContain("escalera");
  });

  it("returns every card for an empty query", () => {
    expect(searchCards(RNE_CARDS, "")).toHaveLength(RNE_CARDS.length);
  });
  it("keeps baño away from vano", () => {
    const results = searchCards(RNE_CARDS, "baño");
    expect(results.slice(0, 3).some((card) => card.slug === "vano-puerta-altura")).toBe(false);
    expect(["giro-silla-ruedas", "puerta-accesible-ancho", "pozo-luz-servicios"]).toContain(
      results[0]?.slug,
    );
  });

  it("ranks exact architectural intent first", () => {
    expect(searchCards(RNE_CARDS, "vano")[0]?.slug).toBe("vano-puerta-altura");
    expect(searchCards(RNE_CARDS, "ancho de puerta de baño")[0]?.slug).toBe(
      "puerta-accesible-ancho",
    );
    expect(searchCards(RNE_CARDS, "puerta baño accesible")[0]?.slug).toBe("puerta-accesible-ancho");
  });

  it.each([
    ["ancho de pasadizo en una posta", "nts113-corredores-asistenciales"],
    ["área mínima de consultorio de medicina general", "nts113-consultorios-areas"],
    ["aforo de sala de lectura de biblioteca", "a090-aforo"],
    ["baños para público en municipalidad", "a090-sshh-publico"],
    ["altura libre centro de salud I-4", "nts113-altura-libre"],
    ["área de aula de primaria", "minedu208-aula"],
    ["puerta de aula colegio", "a040-puertas"],
    ["baños para alumnos de secundaria", "a040-sshh-ebr"],
    ["losa deportiva colegio", "minedu208-losas"],
    ["altura libre colegio", "a040-altura-libre"],
  ])("ranks the relevant card first for %s", (query, slug) => {
    expect(searchCards(RNE_CARDS, query)[0]?.slug).toBe(slug);
    expect(retrieveLocal(query)[0]?.slug).toBe(slug);
  });

  it("treats a stopword-only query as empty", () => {
    expect(searchCards(RNE_CARDS, "de la")).toHaveLength(RNE_CARDS.length);
  });
});
