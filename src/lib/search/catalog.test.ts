import { it, expect } from "vitest";
import { searchCatalog } from "./catalog";
import { RNE_CARDS } from "@/data/seed-rne";
it("encuentra herramientas y medidas sin tildes", () => {
  expect(
    searchCatalog("pintura", RNE_CARDS, [], []).some((e) => e.href.includes("materiales")),
  ).toBe(true);
  expect(
    searchCatalog("closet", RNE_CARDS, [], []).some((e) =>
      e.href.startsWith("/normativa?tab=medidas&q="),
    ),
  ).toBe(true);
  expect(searchCatalog("", RNE_CARDS, [], [])).toEqual([]);
});
it("encuentra las calculadoras y medidas normativas por sus términos", () => {
  expect(searchCatalog("posta urgencias", RNE_CARDS, [], []).map(({ id }) => id)).toContain(
    "c:salud-nts113",
  );
  expect(
    searchCatalog("municipalidad aparatos sanitarios", RNE_CARDS, [], []).map(({ id }) => id),
  ).toContain("c:comunales-a090");
  expect(searchCatalog("colegio ept secundaria", RNE_CARDS, [], []).map(({ id }) => id)).toContain(
    "c:educacion",
  );
  expect(searchCatalog("MINEDU 208 losa", RNE_CARDS, [], []).map(({ id }) => id)).toContain(
    "m:minedu208-losa-i",
  );
  expect(searchCatalog("a.090 art. 11 lectura", RNE_CARDS, [], []).map(({ id }) => id)).toContain(
    "m:a090-sala-lectura",
  );
});
it("busca proyectos locales sin confundir identificadores", () => {
  const result = searchCatalog(
    "obra norte",
    [],
    [
      {
        id: "a/b",
        name: "Obra Norte",
        location: "Lima",
        typology: "vivienda",
        client: "",
        builtArea: null,
        status: "activo",
        updatedAt: "",
        syncState: "local",
      },
    ],
    [],
  );
  expect(result[0].href).toBe("/metrados?project=a%2Fb");
});
