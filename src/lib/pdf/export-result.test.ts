import { describe, expect, it } from "vitest";
import { RNE_CARDS } from "@/data/seed-rne";
import { brandFromStudio, cardSheet, WATERMARK_TEXT } from "@/lib/share/result-sheet";
import { buildResultPdf } from "./export-result";

const studio = {
  studioName: "Estudio Lima",
  fullName: "Lucía Pérez",
  capNumber: "12345",
  brandPrimary: "#13294B",
  brandSecondary: "#C59B27",
  logoDataUrl: null,
};

describe("result PDF", () => {
  it("builds a branded sheet, with the watermark only when asked", () => {
    const sheet = cardSheet(RNE_CARDS[0]);
    const clean = buildResultPdf(sheet, brandFromStudio(studio, false)).output();
    const marked = buildResultPdf(sheet, brandFromStudio(studio, true)).output();
    expect(clean.startsWith("%PDF")).toBe(true);
    expect(clean).toContain("Estudio Lima");
    expect(clean).not.toContain("plan Gratis");
    expect(marked).toContain(WATERMARK_TEXT.split(" · ")[1]);
  });

  it("adds pages when the notes do not fit", () => {
    const sheet = cardSheet(RNE_CARDS[0]);
    sheet.notes = Array.from({ length: 60 }, (_, index) => "Nota larga número " + index + ".");
    const pdf = buildResultPdf(sheet, brandFromStudio(studio, false));
    expect(pdf.getNumberOfPages()).toBeGreaterThan(1);
  });
});
