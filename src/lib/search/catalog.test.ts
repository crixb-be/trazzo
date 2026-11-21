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
        status: "activo",
        updatedAt: "",
        syncState: "local",
      },
    ],
    [],
  );
  expect(result[0].href).toBe("/metrados?project=a%2Fb");
});
