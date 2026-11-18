import { jsPDF } from "jspdf";
import {
  sheetDate,
  WATERMARK_TEXT,
  type ResultSheet,
  type SheetBrand,
} from "@/lib/share/result-sheet";

export interface ResultPdfDiagram {
  /** PNG data URL of the plate. */
  dataUrl: string;
  width: number;
  height: number;
}

function rgb(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function readableOn(hex: string): [number, number, number] {
  const [r, g, b] = rgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? [17, 17, 17] : [255, 255, 255];
}

function logoFormat(dataUrl: string): "PNG" | "JPEG" | null {
  if (dataUrl.startsWith("data:image/png")) return "PNG";
  if (dataUrl.startsWith("data:image/jpeg")) return "JPEG";
  return null;
}

/** One A4 page (more if the notes are long) with the studio's brand on top. */
export function buildResultPdf(
  sheet: ResultSheet,
  brand: SheetBrand,
  diagram?: ResultPdfDiagram | null,
): jsPDF {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 16;
  const inner = pageWidth - margin * 2;
  let y = 0;

  const ensure = (height: number): void => {
    if (y + height <= pageHeight - 26) return;
    pdf.addPage();
    y = margin;
  };
  const paragraph = (
    text: string,
    size: number,
    color: [number, number, number],
    style: "normal" | "bold" = "normal",
    font: "helvetica" | "courier" = "helvetica",
  ): void => {
    pdf.setFont(font, style);
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    const lineHeight = size * 0.46;
    for (const line of pdf.splitTextToSize(text, inner) as string[]) {
      ensure(lineHeight);
      pdf.text(line, margin, y + lineHeight * 0.75);
      y += lineHeight;
    }
  };

  // Brand band.
  pdf.setFillColor(...rgb(brand.primary));
  pdf.rect(0, 0, pageWidth, 30, "F");
  pdf.setFillColor(...rgb(brand.secondary));
  pdf.rect(0, 30, pageWidth, 1.6, "F");
  let textX = margin;
  const format = brand.logoDataUrl ? logoFormat(brand.logoDataUrl) : null;
  if (brand.logoDataUrl && format) {
    try {
      pdf.setFillColor(255, 255, 255);
      pdf.rect(margin, 6, 18, 18, "F");
      pdf.addImage(brand.logoDataUrl, format, margin + 1, 7, 16, 16);
      textX = margin + 23;
    } catch {
      // An unreadable logo must not block the export.
    }
  }
  pdf.setTextColor(...readableOn(brand.primary));
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text(brand.name, textX, brand.byline ? 15 : 18);
  if (brand.byline) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(brand.byline, textX, 22);
  }
  y = 42;

  paragraph(sheet.eyebrow, 9, [138, 90, 18], "normal", "courier");
  y += 2;
  paragraph(sheet.title, 22, [17, 17, 17], "bold");
  y += 2;
  if (sheet.subtitle) paragraph(sheet.subtitle, 11, [51, 51, 51]);
  y += 6;

  if (diagram) {
    const scale = Math.min(inner / diagram.width, 90 / diagram.height);
    const width = diagram.width * scale;
    const height = diagram.height * scale;
    ensure(height + 6);
    try {
      pdf.addImage(diagram.dataUrl, "PNG", margin + (inner - width) / 2, y, width, height);
      y += height + 6;
    } catch {
      // Keep the text-only sheet.
    }
  }

  const valueWidth = 52;
  for (const row of sheet.rows) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10.5);
    const markWidth = row.status ? 7 : 0;
    const labelLines = pdf.splitTextToSize(
      row.label,
      inner - valueWidth - markWidth - 4,
    ) as string[];
    pdf.setFont("courier", "bold");
    const valueLines = pdf.splitTextToSize(row.value, valueWidth) as string[];
    const height = Math.max(labelLines.length, valueLines.length) * 5 + 4;
    ensure(height);
    pdf.setDrawColor(217, 214, 207);
    pdf.line(margin, y, pageWidth - margin, y);
    if (row.status) {
      // Drawn marks: the built-in PDF fonts have no check or cross glyph.
      const cx = margin + 2.4;
      const cy = y + 5.2;
      pdf.setLineWidth(0.6);
      if (row.status === "ok") {
        pdf.setDrawColor(21, 128, 61);
        pdf.line(cx - 1.6, cy, cx - 0.4, cy + 1.3);
        pdf.line(cx - 0.4, cy + 1.3, cx + 1.8, cy - 1.5);
      } else {
        pdf.setDrawColor(185, 28, 28);
        pdf.line(cx - 1.4, cy - 1.4, cx + 1.4, cy + 1.4);
        pdf.line(cx - 1.4, cy + 1.4, cx + 1.4, cy - 1.4);
      }
      pdf.setLineWidth(0.2);
    }
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(34, 34, 34);
    pdf.text(labelLines, margin + markWidth, y + 6);
    pdf.setFont("courier", "bold");
    if (row.status === "fail") pdf.setTextColor(185, 28, 28);
    else pdf.setTextColor(17, 17, 17);
    pdf.text(valueLines, pageWidth - margin, y + 6, { align: "right" });
    y += height;
  }
  if (sheet.rows.length) y += 5;

  for (const note of sheet.notes) {
    paragraph(note, 10.5, [51, 51, 51]);
    y += 3;
  }

  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(85, 85, 85);
    const disclaimer = pdf.splitTextToSize(sheet.disclaimer, inner) as string[];
    pdf.text(disclaimer, margin, pageHeight - 18);
    pdf.setFont("courier", "normal");
    pdf.text(
      sheetDate() + (brand.watermark ? " · " + WATERMARK_TEXT : " · trazo"),
      margin,
      pageHeight - 8,
    );
    if (pages > 1) {
      pdf.text(page + " / " + pages, pageWidth - margin, pageHeight - 8, { align: "right" });
    }
  }
  return pdf;
}
