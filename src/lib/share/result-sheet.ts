import type { CalcCheck } from "@/lib/calculators/types";
import { RNE_WARNING } from "@/lib/calculators/types";
import type { RneCard } from "@/data/seed-rne";

/**
 * A one-page summary of a calculator result or an RNE card, laid out the same
 * way as an image (for WhatsApp) and as a PDF.
 */
export interface SheetRow {
  label: string;
  value: string;
  /** Pass or fail mark for normative checks; omitted for plain data rows. */
  status?: "ok" | "fail";
}

export interface ResultSheet {
  kind: "calculo" | "ficha";
  eyebrow: string;
  title: string;
  subtitle: string;
  rows: SheetRow[];
  notes: string[];
  disclaimer: string;
}

export interface SheetBrand {
  name: string;
  byline: string;
  primary: string;
  secondary: string;
  logoDataUrl: string | null;
  /** Adds the "hecho con TRAZZO" line of the free plan. */
  watermark: boolean;
}

export interface StudioBrandSource {
  studioName: string;
  fullName: string;
  capNumber: string;
  brandPrimary: string;
  brandSecondary: string;
  logoDataUrl: string | null;
}

export const WATERMARK_TEXT = "Hecho con TRAZZO · plan Gratis";

/** Hides floating-point noise such as 0.18000000000000002. */
function tidy(value: number | string): string {
  return typeof value === "number" ? String(Number(value.toFixed(3))) : value;
}

export function calculatorSheet(input: {
  eyebrow: string;
  main: string;
  details: string;
  checks: CalcCheck[];
  warnings: string[];
}): ResultSheet {
  return {
    kind: "calculo",
    eyebrow: input.eyebrow,
    title: input.main,
    subtitle: input.details,
    rows: input.checks.map((check) => ({
      label: check.label + (check.ref ? " (" + check.ref + ")" : ""),
      value: tidy(check.value) + " / " + tidy(check.limit),
      status: check.pass ? "ok" : "fail",
    })),
    // The general disclaimer goes once at the foot, not also as a note.
    notes: input.warnings.filter((warning) => warning !== RNE_WARNING),
    disclaimer: RNE_WARNING,
  };
}

export function cardSheet(card: RneCard): ResultSheet {
  const rows: SheetRow[] = [
    { label: "Norma", value: card.norm_code },
    { label: "Artículo", value: card.article },
    { label: "Edición", value: card.edition },
  ];
  if (card.min_value !== null) {
    rows.unshift({
      label: "Valor mínimo referencial",
      value: (card.min_value + " " + card.unit).trim(),
    });
  }
  const notes = [card.body, card.legal_note].filter((text) => text.trim().length > 0);
  if (!card.verified_at) {
    notes.push("Ficha por verificar: aún no contrastada con el texto oficial del RNE.");
  }
  return {
    kind: "ficha",
    eyebrow: card.category.toUpperCase() + " / " + card.norm_code,
    title: card.title,
    subtitle: card.summary,
    rows,
    notes,
    disclaimer: RNE_WARNING,
  };
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function brandFromStudio(studio: StudioBrandSource, watermark: boolean): SheetBrand {
  const name = studio.studioName.trim() || studio.fullName.trim() || "TRAZZO";
  const person = studio.studioName.trim() ? studio.fullName.trim() : "";
  const cap = studio.capNumber.trim() ? "CAP " + studio.capNumber.trim() : "";
  return {
    name,
    byline: [person, cap].filter(Boolean).join(" · "),
    primary: HEX_COLOR.test(studio.brandPrimary) ? studio.brandPrimary : "#13294B",
    secondary: HEX_COLOR.test(studio.brandSecondary) ? studio.brandSecondary : "#C59B27",
    logoDataUrl: studio.logoDataUrl,
    watermark,
  };
}

/** Greedy word wrap against any width measure (canvas or PDF). */
export function wrapText(
  text: string,
  maxWidth: number,
  measure: (candidate: string) => number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\n+/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? line + " " + word : word;
      if (line && measure(candidate) > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

export function sheetFileName(sheet: ResultSheet, extension: "png" | "pdf"): string {
  const slug = sheet.title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return "trazzo-" + (slug || sheet.kind) + "." + extension;
}

/** Plain-text version sent along with the file, and useful on its own. */
export function sheetText(sheet: ResultSheet): string {
  const rows = sheet.rows.map(
    (row) =>
      (row.status === "ok" ? "✓ " : row.status === "fail" ? "✗ " : "") +
      row.label +
      ": " +
      row.value,
  );
  return [sheet.title, sheet.subtitle, ...rows].filter(Boolean).join("\n");
}

export function sheetDate(date: Date = new Date()): string {
  return date.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
}
