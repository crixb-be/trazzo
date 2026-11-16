import { describe, expect, it } from "vitest";
import { RNE_CARDS } from "@/data/seed-rne";
import { RNE_WARNING } from "@/lib/calculators/types";
import { computeStair } from "@/lib/calculators/stairs";
import {
  brandFromStudio,
  calculatorSheet,
  cardSheet,
  sheetFileName,
  sheetText,
  wrapText,
} from "./result-sheet";

const studio = {
  studioName: "Estudio Lima",
  fullName: "Lucía Pérez",
  capNumber: "12345",
  brandPrimary: "#112233",
  brandSecondary: "no-es-color",
  logoDataUrl: null,
};

describe("result sheet", () => {
  it("turns a calculator result into rows with pass and fail marks", () => {
    const result = computeStair({ floorHeight: 2.7, width: 0.9, use: "vivienda" });
    const sheet = calculatorSheet({
      eyebrow: "RESULTADO / A.010",
      main: result.values.risers + " contrapasos",
      details: "cp 0.180 m",
      checks: result.checks,
      warnings: [...result.warnings, RNE_WARNING],
    });
    expect(sheet.rows).toHaveLength(result.checks.length);
    expect(sheet.rows.every((row) => row.status === "ok" || row.status === "fail")).toBe(true);
    expect(sheet.notes).not.toContain(RNE_WARNING);
    expect(sheet.rows.every((row) => !/\d\.\d{4,}/.test(row.value))).toBe(true);
    expect(sheet.disclaimer).toBe(RNE_WARNING);
    expect(sheetText(sheet)).toContain("contrapasos");
  });

  it("summarises a card and flags unverified content", () => {
    const card = RNE_CARDS[0];
    const sheet = cardSheet(card);
    expect(sheet.title).toBe(card.title);
    expect(sheet.rows.some((row) => row.value === card.norm_code)).toBe(true);
    if (!card.verified_at) expect(sheet.notes.join(" ")).toContain("por verificar");
  });

  it("builds the brand from the studio profile with safe colours", () => {
    const brand = brandFromStudio(studio, true);
    expect(brand.name).toBe("Estudio Lima");
    expect(brand.byline).toBe("Lucía Pérez · CAP 12345");
    expect(brand.primary).toBe("#112233");
    expect(brand.secondary).toBe("#C59B27");
    expect(brand.watermark).toBe(true);
    expect(brandFromStudio({ ...studio, studioName: "", fullName: "" }, false).name).toBe("TRAZZO");
  });

  it("wraps text to a width and names files without accents", () => {
    const lines = wrapText("uno dos tres cuatro cinco", 9, (text) => text.length);
    expect(lines).toEqual(["uno dos", "tres", "cuatro", "cinco"]);
    expect(wrapText("a\n\nb", 10, (text) => text.length)).toEqual(["a", "b"]);
    const sheet = cardSheet({ ...RNE_CARDS[0], title: "Ancho mínimo de pasaje — útil" });
    expect(sheetFileName(sheet, "png")).toBe("trazzo-ancho-minimo-de-pasaje-util.png");
  });
});
