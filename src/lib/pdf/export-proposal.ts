import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import {
  FEE_TYPOLOGIES,
  formatPen,
  formatWeekRange,
  paymentAmounts,
  type FeeQuoteResult,
} from "@/lib/calculators/fees";
import type { FeeQuote } from "@/lib/offline/db";

export interface ProposalOptions {
  professional: { fullName: string; capNumber: string };
  watermark: boolean;
  date?: Date;
}

type PdfWithTable = jsPDF & { lastAutoTable?: { finalY: number } };
const months = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function dateLabel(date: Date): string {
  return date.getDate() + " de " + months[date.getMonth()] + " de " + date.getFullYear();
}
function slug(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "propuesta"
  );
}
function typologyLabel(value: string): string {
  return FEE_TYPOLOGIES.find((item) => item.value === value)?.label ?? value;
}
function nextSection(pdf: jsPDF, y: number, height = 20): number {
  if (y + height > 272) {
    pdf.addPage();
    return 22;
  }
  return y;
}
function sectionTitle(pdf: jsPDF, number: string, title: string, y: number): number {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(181, 130, 47);
  if (number) pdf.text(number, 18, y);
  pdf.setTextColor(26, 27, 31);
  pdf.text(title.toUpperCase(), number ? 28 : 18, y);
  pdf.setDrawColor(181, 130, 47);
  pdf.setLineWidth(0.25);
  pdf.line(18, y + 3, 192, y + 3);
  return y + 10;
}
function drawBullets(pdf: jsPDF, items: string[], y: number): number {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(26, 27, 31);
  for (const item of items) {
    const lines = pdf.splitTextToSize("• " + item, 174) as string[];
    pdf.text(lines, 20, y);
    y += lines.length * 4.5 + 2;
  }
  return y;
}
function addFooter(pdf: jsPDF, quote: FeeQuote, watermark: boolean): void {
  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    const width = pdf.internal.pageSize.getWidth();
    const height = pdf.internal.pageSize.getHeight();
    if (watermark) {
      pdf.saveGraphicsState();
      pdf.setGState(
        new (pdf.GState as unknown as new (options: { opacity: number }) => never)({
          opacity: 0.12,
        }),
      );
      pdf.setTextColor(140, 140, 140);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(25);
      pdf.text("VISTA PREVIA · TRAZZO GRATIS", width / 2, height / 2, {
        angle: 35,
        align: "center",
      });
      pdf.restoreGraphicsState();
    }
    pdf.setDrawColor(181, 130, 47);
    pdf.setLineWidth(0.2);
    pdf.line(18, height - 17, width - 18, height - 17);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(107, 109, 117);
    pdf.text(quote.code + " · Página " + page + " de " + pageCount, 18, height - 11);
    pdf.text(
      "Honorarios referenciales; no incluyen tasas ni derechos salvo indicación.",
      192,
      height - 11,
      { align: "right" },
    );
    if (watermark)
      pdf.text("Descarga sin marca de agua con los planes Estudiante o PRO.", 18, height - 6);
  }
}

export function buildProposalPdf(
  quote: FeeQuote,
  result: FeeQuoteResult,
  options: ProposalOptions,
): jsPDF {
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: false });
  const width = pdf.internal.pageSize.getWidth();
  pdf.setTextColor(26, 27, 31);
  pdf.setFont("helvetica", "normal");
  let y = 20;
  if (options.professional.fullName) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text("Arq. " + options.professional.fullName, 18, y);
    y += 5;
    if (options.professional.capNumber) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(107, 109, 117);
      pdf.text("CAP N° " + options.professional.capNumber, 18, y);
      y += 4;
    }
    pdf.setFontSize(7.5);
    pdf.text("Propuesta generada con TRAZZO", 18, y);
  } else {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.text("T R A Z Z O", 18, y + 2);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(107, 109, 117);
    pdf.text("RNE PRO · PERÚ", 18, y + 8);
  }
  pdf.setTextColor(26, 27, 31);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("PROPUESTA DE HONORARIOS", width - 18, 20, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(107, 109, 117);
  pdf.text(quote.code, width - 18, 26, { align: "right" });
  pdf.text(dateLabel(options.date ?? new Date()), width - 18, 31, { align: "right" });
  pdf.setDrawColor(181, 130, 47);
  pdf.setLineWidth(0.35);
  pdf.line(18, 39, width - 18, 39);
  y = 50;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(107, 109, 117);
  pdf.text("CLIENTE", 18, y);
  pdf.text("PROYECTO", 82, y);
  pdf.text("UBICACIÓN", 145, y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(26, 27, 31);
  pdf.text(quote.clientName || "—", 18, y + 6);
  pdf.text(quote.projectName || "—", 82, y + 6);
  pdf.text(quote.location || "—", 145, y + 6);
  y = 72;
  y = sectionTitle(pdf, "", "Resumen del proyecto", y);
  const summary = [
    [
      "Tipología",
      typologyLabel(quote.input.typology),
      "Área techada",
      quote.input.areaM2.toFixed(2) + " m²",
    ],
    ["Pisos", String(quote.input.floors), "Ubicación", quote.location || "—"],
    ["Plazo total", quote.input.weeks + " semanas", "", ""],
  ];
  autoTable(pdf, {
    startY: y,
    margin: { left: 18, right: 18 },
    body: summary,
    theme: "plain",
    styles: { font: "helvetica", fontSize: 9, textColor: [26, 27, 31], cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [107, 109, 117], cellWidth: 28 },
      1: { cellWidth: 55 },
      2: { fontStyle: "bold", textColor: [107, 109, 117], cellWidth: 32 },
    },
  });
  y = ((pdf as PdfWithTable).lastAutoTable?.finalY ?? y + 22) + 10;
  y = nextSection(pdf, y, 42);
  y = sectionTitle(pdf, "", "Propuesta económica", y);
  const body = result.lines.map((line) => [line.label, line.detail, formatPen(line.amount)]);
  const foot: string[][] = [["", "Subtotal", formatPen(result.subtotal)]];
  if (result.taxLabel === "IGV 18%") foot.push(["", "IGV 18%", formatPen(result.taxAmount)]);
  else {
    foot.push(["", "Recibo por Honorarios", "—"]);
    if (result.retention > 0)
      foot.push(["", "Retención 8% (si aplica)", "- " + formatPen(result.retention)]);
  }
  foot.push(["", "TOTAL", formatPen(result.total)]);
  autoTable(pdf, {
    startY: y,
    margin: { left: 18, right: 18 },
    head: [["Ítem", "Detalle", "Subtotal"]],
    body,
    foot,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      textColor: [26, 27, 31],
      lineColor: [220, 218, 211],
      lineWidth: 0.15,
      cellPadding: 3,
    },
    headStyles: { fillColor: [243, 241, 236], textColor: [181, 130, 47], fontStyle: "bold" },
    footStyles: { fillColor: [255, 255, 255], textColor: [26, 27, 31], fontStyle: "normal" },
    columnStyles: {
      0: { cellWidth: 48 },
      2: { cellWidth: 32, halign: "right" },
    },
    didParseCell: (data) => {
      if (data.section !== "foot") return;
      // columnStyles only reach the body, so totals are aligned here.
      if (data.column.index === 2) data.cell.styles.halign = "right";
      if (data.row.index === foot.length - 1) data.cell.styles.fontStyle = "bold";
    },
  });
  y = ((pdf as PdfWithTable).lastAutoTable?.finalY ?? y + 30) + 12;
  y = nextSection(pdf, y, 25);
  y = sectionTitle(pdf, "1", "Entregables", y);
  y = drawBullets(pdf, quote.deliverables, y) + 5;
  y = nextSection(pdf, y, 30);
  y = sectionTitle(pdf, "2", "Cronograma y tiempos de entrega", y);
  autoTable(pdf, {
    startY: y,
    margin: { left: 18, right: 18 },
    head: [["Hito", "Semanas"]],
    body: quote.schedule.map((milestone) => [milestone.label, formatWeekRange(milestone)]),
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      textColor: [26, 27, 31],
      lineColor: [220, 218, 211],
      lineWidth: 0.15,
      cellPadding: 3,
    },
    headStyles: { fillColor: [243, 241, 236], textColor: [181, 130, 47] },
    // Only fixed columns get a width; the first one takes the remaining space.
    columnStyles: { 1: { cellWidth: 36, halign: "center" } },
  });
  y = ((pdf as PdfWithTable).lastAutoTable?.finalY ?? y + 20) + 12;
  y = nextSection(pdf, y, 30);
  y = sectionTitle(pdf, "3", "Forma de pago", y);
  const installmentAmounts = paymentAmounts(result.total, quote.payment.installments);
  autoTable(pdf, {
    startY: y,
    margin: { left: 18, right: 18 },
    head: [["Armada", "%", "Monto"]],
    body: quote.payment.installments.map((installment, index) => [
      installment.label,
      installment.pct.toFixed(2) + "%",
      formatPen(installmentAmounts[index] ?? 0),
    ]),
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      textColor: [26, 27, 31],
      lineColor: [220, 218, 211],
      lineWidth: 0.15,
      cellPadding: 3,
    },
    headStyles: { fillColor: [243, 241, 236], textColor: [181, 130, 47] },
    columnStyles: {
      1: { cellWidth: 28, halign: "center" },
      2: { cellWidth: 38, halign: "right" },
    },
  });
  y = ((pdf as PdfWithTable).lastAutoTable?.finalY ?? y + 20) + 12;
  y = nextSection(pdf, y, 30);
  y = sectionTitle(pdf, "4", "Condiciones específicas", y);
  y = drawBullets(pdf, quote.conditions, y);
  if (pdf.internal.pageSize.getHeight() - (y + 8) < 45) {
    pdf.addPage();
    y = 25;
  }
  const signatureY = Math.min(y + 12, 245);
  pdf.setDrawColor(181, 130, 47);
  pdf.setLineWidth(0.25);
  pdf.line(24, signatureY + 20, 88, signatureY + 20);
  pdf.line(116, signatureY + 20, 180, signatureY + 20);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.5);
  pdf.setTextColor(26, 27, 31);
  pdf.text("Arq. " + (options.professional.fullName || "________________"), 24, signatureY + 27);
  pdf.text("Aceptación del cliente", 116, signatureY + 27);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(107, 109, 117);
  pdf.text("CAP N° " + (options.professional.capNumber || "________________"), 24, signatureY + 33);
  pdf.text(quote.clientName || "________________", 116, signatureY + 33);
  pdf.text("Fecha: ____", 116, signatureY + 39);
  addFooter(pdf, quote, options.watermark);
  return pdf;
}

export function exportProposalPdf(
  quote: FeeQuote,
  result: FeeQuoteResult,
  options: ProposalOptions,
): void {
  buildProposalPdf(quote, result, options).save(
    quote.code + "_" + slug(quote.projectName) + ".pdf",
  );
}
