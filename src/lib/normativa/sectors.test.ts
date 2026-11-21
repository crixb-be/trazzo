import { describe, expect, it } from "vitest";
import { EDUCATION_CARDS } from "@/data/norms/education";
import { NTS113_CARDS } from "@/data/norms/nts113";
import { RNE_CARDS } from "@/data/seed-rne";
import { matchesAccessFilter } from "@/lib/ui/access-filter";
import { codesForSector, matchesSector, sectorOfCode, SECTORS, type SectorId } from "./sectors";

const filterBySector = (id: SectorId) =>
  RNE_CARDS.filter(({ norm_code }) => matchesSector(id, norm_code));

describe("sectores normativos", () => {
  it("asigna cada código del catálogo a un sector y solo usa códigos existentes", () => {
    const catalogCodes = new Set(RNE_CARDS.map(({ norm_code }) => norm_code));
    expect(new Set(codesForSector("todos"))).toEqual(catalogCodes);
    for (const code of catalogCodes) {
      const sectors = SECTORS.filter(({ id }) => id !== "todos" && matchesSector(id, code));
      expect(sectors, code).toHaveLength(1);
      expect(sectorOfCode(code)).toBe(sectors[0].id);
    }
    for (const { codes } of SECTORS) {
      for (const code of codes) expect(catalogCodes.has(code), code).toBe(true);
    }
  });

  it("filtra las fichas de Educación, Salud y Comercio y Oficinas", () => {
    expect(codesForSector("educacion")).toEqual(["A.040", "MINEDU 208"]);
    expect(filterBySector("educacion")).toEqual(EDUCATION_CARDS);
    expect(filterBySector("salud")).toEqual(NTS113_CARDS);
    expect(new Set(filterBySector("comercio-oficinas").map(({ norm_code }) => norm_code))).toEqual(
      new Set(["A.070", "A.080"]),
    );
    expect(filterBySector("todos")).toEqual(RNE_CARDS);
  });

  it("combina el sector con el filtro de acceso PRO", () => {
    const cards = filterBySector("educacion");
    const filtered = cards.filter(({ is_pro }) =>
      matchesAccessFilter("pro", { isPro: Boolean(is_pro), favorite: false }),
    );
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered).toEqual(EDUCATION_CARDS.filter(({ is_pro }) => is_pro));
  });
});
