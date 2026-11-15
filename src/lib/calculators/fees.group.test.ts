import { describe, expect, it } from "vitest";
import { createDefaultFeeInput, defaultDeliverables, groupDeliverables } from "./fees";

describe("groupDeliverables", () => {
  it("groups defaults and keeps custom items as adicionales", () => {
    const input = createDefaultFeeInput();
    const groups = groupDeliverables(input, [...defaultDeliverables(input), "Visita especial"]);
    expect(groups.some((group) => group.group === "Diseño arquitectónico")).toBe(true);
    expect(groups.find((group) => group.group === "Adicionales")?.items).toContain(
      "Visita especial",
    );
  });

  it("puts each specialty plan under its own group, not under design", () => {
    const input = createDefaultFeeInput();
    const groups = groupDeliverables(input, defaultDeliverables(input));
    const groupOf = (item: string) => groups.find((group) => group.items.includes(item))?.group;
    expect(groupOf("Planos de distribución, cortes y elevaciones")).toBe("Diseño arquitectónico");
    expect(groupOf("Planos y memoria de estructuras")).toBe("Expediente técnico — Estructuras");
    expect(groupOf("Planos y memoria de instalaciones sanitarias")).toBe(
      "Expediente técnico — Inst. Sanitarias",
    );
    expect(groupOf("Planos y memoria de instalaciones eléctricas")).toBe(
      "Expediente técnico — Inst. Eléctricas",
    );
  });
});
