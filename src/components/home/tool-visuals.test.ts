import { describe, expect, it } from "vitest";
import { QUICK_TOOLS } from "@/lib/onboarding/onboarding";
import { DISCIPLINE_FAMILY, tileLayout, toolVisual } from "./tool-visuals";

describe("grilla de herramientas de Inicio", () => {
  it("nunca deja la última fila a medias, de 1 a 8 herramientas", () => {
    for (let count = 1; count <= 8; count++) {
      const { columns, wide, wideMobile } = tileLayout(count);
      // Each wide tile takes one extra cell.
      expect((count + wide) % columns, `escritorio con ${count}`).toBe(0);
      expect((count + wideMobile) % 2, `móvil con ${count}`).toBe(0);
      expect(wide).toBeLessThanOrEqual(count);
    }
  });
  it("la grilla por defecto de 8 es 4 × 2 sin tarjetas anchas", () => {
    expect(tileLayout(8)).toEqual({ columns: 4, wide: 0, wideMobile: 0 });
  });
  it("cada herramienta tiene ícono y familia propios", () => {
    for (const tool of QUICK_TOOLS) expect(toolVisual(tool.id).family).not.toBe("piedra");
    const defaults = QUICK_TOOLS.slice(0, 8).map((tool) => toolVisual(tool.id).icon);
    expect(new Set(defaults).size).toBe(8);
    expect(DISCIPLINE_FAMILY.Seguridad).toBe("terracota");
  });
});
