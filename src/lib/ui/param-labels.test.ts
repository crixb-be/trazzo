import { describe, expect, it } from "vitest";
import { RNE_CARDS } from "@/data/seed-rne";
import { paramMeta } from "./param-labels";

describe("paramMeta", () => {
  it("labels counts as units, not metres", () => {
    expect(paramMeta("risers")).toEqual({ label: "Contrapasos", unit: "und" });
    expect(paramMeta("cp").unit).toBe("m");
  });

  it("has a readable label for every numeric parameter in the seed", () => {
    for (const card of RNE_CARDS) {
      for (const [name, value] of Object.entries(card.params)) {
        if (typeof value !== "number") continue;
        expect(paramMeta(name).label, card.slug + "." + name).not.toBe(name.replaceAll("_", " "));
      }
    }
  });

  it("falls back to the raw name for unknown parameters", () => {
    expect(paramMeta("new_param")).toEqual({ label: "new param", unit: "" });
  });
});
