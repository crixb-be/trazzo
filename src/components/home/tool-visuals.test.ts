import { describe, expect, it } from "vitest";
import { disciplineVisual, HOME_SHORTCUTS } from "./tool-visuals";

describe("Acceso rápido", () => {
  it("shows four fixed destinations with distinct icons", () => {
    expect(HOME_SHORTCUTS.map(({ href }) => href)).toEqual([
      "/calculadoras",
      "/metrados",
      "/normativa",
      "/normativa?tab=medidas",
    ]);
    expect(new Set(HOME_SHORTCUTS.map(({ icon }) => icon)).size).toBe(4);
    expect(disciplineVisual("Seguridad").family).toBe("terracota");
  });
});
