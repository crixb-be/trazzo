import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import {
  FEE_TYPOLOGIES,
  formatPen,
  lineDetailForProposal,
  formatWeekRange,
  groupDeliverables,
  paymentAmounts,
  type FeeQuoteResult,
} from "@/lib/calculators/fees";
import type { FeeQuote, StudioProfile } from "@/lib/offline/db";
import { signatureParties, type SignatureParty } from "./signatures";
import { DEFAULT_STUDIO_PROFILE } from "@/lib/offline/profile";

export interface ProposalOptions {
  studio?: StudioProfile;
  professional?: { fullName: string; capNumber: string };
  watermark: boolean;
  date?: Date;
}

type PdfWithTable = jsPDF & { lastAutoTable?: { finalY: number } };
type Rgb = [number, number, number];

const INK: Rgb = [26, 27, 31];
const MUTED: Rgb = [107, 109, 117];
const WHITE: Rgb = [255, 255, 255];
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
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "propuesta"
  );
}

function parseHex(value: string, fallback: Rgb): Rgb {
  const match = /^#?([0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return fallback;
  return [
    Number.parseInt(match[1].slice(0, 2), 16),
    Number.parseInt(match[1].slice(2, 4), 16),
    Number.parseInt(match[1].slice(4, 6), 16),
  ];
}

function tint(color: Rgb, amount: number): Rgb {
  return color.map((channel) => Math.round(255 + (channel - 255) * amount)) as Rgb;
}

function typologyLabel(value: string): string {
  return FEE_TYPOLOGIES.find((item) => item.value === value)?.label ?? value;
}

function studioFrom(options: ProposalOptions): StudioProfile {
  return {
    ...DEFAULT_STUDIO_PROFILE,
    ...(options.studio ?? {}),
    ...(options.professional ?? {}),
  };
}

/** jsPDF needs the real image format; logos are PNG today but older ones may be JPEG/WebP. */
function imageFormat(dataUrl: string): "PNG" | "JPEG" | "WEBP" {
  const mime = /^data:image\/([a-z+]+);/i.exec(dataUrl)?.[1]?.toLowerCase() ?? "png";
  if (mime === "jpeg" || mime === "jpg") return "JPEG";
  if (mime === "webp") return "WEBP";
  return "PNG";
}

function addLogoOrMonogram(
  pdf: jsPDF,
  studio: StudioProfile,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
  primary: Rgb,
): void {
  if (studio.logoDataUrl) {
    try {
      const properties = pdf.getImageProperties(studio.logoDataUrl);
      const ratio = Math.min(maxWidth / properties.width, maxHeight / properties.height);
      pdf.addImage(
        studio.logoDataUrl,
        imageFormat(studio.logoDataUrl),
        x,
        y,
        properties.width * ratio,
        properties.height * ratio,
      );
      return;
    } catch {
      // Fall back to the monogram when a user-provided image is not embeddable.
    }
  }
  pdf.setFillColor(...primary);
  pdf.circle(x + maxWidth / 2, y + maxHeight / 2, Math.min(maxWidth, maxHeight) / 2, "F");
  pdf.setTextColor(...WHITE);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(Math.min(maxHeight * 0.8, 18));
  const initials =
    studio.studioName
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .slice(0, 2) || "T";
  pdf.text(initials.toUpperCase(), x + maxWidth / 2, y + maxHeight * 0.64, { align: "center" });
}

function sectionTitle(
  pdf: jsPDF,
  number: string,
  title: string,
  y: number,
  primary: Rgb,
  secondary: Rgb,
): number {
  pdf.setFillColor(...primary);
  pdf.rect(18, y - 7, 7, 7, "F");
  pdf.setTextColor(...WHITE);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.text(number, 21.5, y - 2.2, { align: "center" });
  pdf.setTextColor(...primary);
  pdf.setFontSize(10.5);
  pdf.text(title.toUpperCase(), 29, y - 1.5);
  pdf.setDrawColor(...secondary);
  pdf.setLineWidth(0.3);
  pdf.line(18, y + 3, 192, y + 3);
  return y + 10;
}

function drawFooter(
  pdf: jsPDF,
  studio: StudioProfile,
  date: string,
  page: number,
  total: number,
  secondary: Rgb,
  watermark: boolean,
): void {
  const height = pdf.internal.pageSize.getHeight();
  pdf.setDrawColor(...secondary);
  pdf.setLineWidth(0.25);
  pdf.line(18, height - 17, 192, height - 17);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(...MUTED);
  const identity = [studio.studioName, studio.ruc ? "RUC " + studio.ruc : "", studio.address]
    .filter(Boolean)
    .join(" · ");
  pdf.text(identity || "Propuesta generada con TRAZO", 18, height - 11);
  pdf.text("Página " + page + " de " + total, 192, height - 11, { align: "right" });
  if (watermark)
    pdf.text("Descarga sin marca de agua con los planes Estudiante o PRO.", 18, height - 6);
  void date;
}

function drawWatermark(pdf: jsPDF): void {
  const width = pdf.internal.pageSize.getWidth();
  const height = pdf.internal.pageSize.getHeight();
  pdf.saveGraphicsState();
  pdf.setGState(
    new (pdf.GState as unknown as new (options: { opacity: number }) => never)({ opacity: 0.1 }),
  );
  pdf.setTextColor(130, 130, 130);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(25);
  pdf.text("VISTA PREVIA · TRAZO GRATIS", width / 2, height / 2, { angle: 35, align: "center" });
  pdf.restoreGraphicsState();
}

function addContentHeader(
  pdf: jsPDF,
  studio: StudioProfile,
  date: string,
  primary: Rgb,
  secondary: Rgb,
): void {
  addLogoOrMonogram(pdf, studio, 18, 8, 20, 11, primary);
  pdf.setTextColor(...primary);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text(studio.studioName || "TRAZO", 192, 13, { align: "right" });
  pdf.setTextColor(...MUTED);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(date, 192, 18, { align: "right" });
  pdf.setDrawColor(...secondary);
  pdf.setLineWidth(0.3);
  pdf.line(18, 24, 192, 24);
}

function addCover(
  pdf: jsPDF,
  quote: FeeQuote,
  studio: StudioProfile,
  date: string,
  primary: Rgb,
  secondary: Rgb,
): void {
  pdf.setFillColor(...primary);
  pdf.rect(0, 0, 14, 297, "F");
  pdf.setFillColor(...secondary);
  pdf.rect(14, 0, 2.5, 297, "F");
  pdf.setFillColor(...primary);
  pdf.triangle(140, 0, 210, 0, 210, 70, "F");
  pdf.setFillColor(...secondary);
  pdf.lines(
    [
      [0, 0],
      [70, 70],
    ],
    137,
    2,
    [1, 1],
    "F",
    true,
  );
  pdf.triangle(186, 297, 210, 297, 210, 273, "F");
  addLogoOrMonogram(pdf, studio, 30, 28, 55, 30, primary);
  pdf.setTextColor(...primary);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text((studio.studioName || "TRAZO").toUpperCase(), 30, 65);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  // Under the studio name: its address when known; TRAZO keeps its tagline.
  pdf.text(
    studio.studioName ? studio.address || "Arquitectura y proyectos" : "La navaja suiza del arquitecto",
    30,
    71,
  );
  const title =
    quote.documentType === "cotizacion"
      ? "COTIZACIÓN DE DISEÑO Y PROYECTO"
      : "PROPUESTA DE SERVICIOS PROFESIONALES";
  pdf.setTextColor(...primary);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(24);
  pdf.text(pdf.splitTextToSize(title, 145), 30, 108);
  pdf.setDrawColor(...secondary);
  pdf.setLineWidth(1);
  pdf.line(30, 143, 70, 143);
  pdf.setTextColor(...INK);
  pdf.setFontSize(17);
  pdf.text(quote.projectName || "Proyecto sin nombre", 30, 157);
  pdf.setTextColor(...MUTED);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text(quote.location || "Ubicación por confirmar", 30, 166);
  pdf.setFontSize(9);
  pdf.text(quote.code + " · " + date, 30, 176);
  pdf.setFillColor(...tint(secondary, 0.06));
  pdf.rect(30, 198, 150, 39, "F");
  pdf.setFillColor(...secondary);
  pdf.rect(30, 198, 2, 39, "F");
  pdf.setTextColor(...secondary);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("EL CONTRATANTE", 38, 208);
  pdf.setTextColor(...INK);
  pdf.setFontSize(14);
  pdf.text(quote.clientName || "Cliente por confirmar", 38, 218);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text("Proyecto: " + (quote.projectName || "—"), 38, 226);
  pdf.text("Ubicación: " + (quote.location || "—"), 38, 233);
  pdf.setTextColor(...MUTED);
  pdf.setFontSize(8);
  const author = [
    studio.fullName ? "Arq. " + studio.fullName : "",
    studio.capNumber ? "CAP N° " + studio.capNumber : "",
  ]
    .filter(Boolean)
    .join(" · ");
  pdf.text("Elaborado por: " + (author || "TRAZO"), 30, 270);
  pdf.text(
    [studio.studioName, studio.ruc ? "RUC " + studio.ruc : "", studio.address]
      .filter(Boolean)
      .join(" · ") || "TRAZO · La navaja suiza del arquitecto",
    30,
    278,
  );
}

function proposalTable(
  pdf: jsPDF,
  startY: number,
  head: string[][],
  body: string[][],
  foot: string[][],
  primary: Rgb,
  soft: Rgb,
): number {
  // Money and duration live in the last column; it is the one aligned right.
  const lastColumn = (head[0]?.length ?? 1) - 1;
  autoTable(pdf, {
    startY,
    margin: { left: 18, right: 18 },
    head,
    body,
    foot,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      textColor: INK,
      lineColor: [220, 218, 211],
      lineWidth: 0.15,
      cellPadding: 3,
    },
    headStyles: { fillColor: primary, textColor: WHITE, fontStyle: "bold" },
    alternateRowStyles: { fillColor: soft },
    footStyles: { fillColor: WHITE, textColor: INK },
    columnStyles: { [lastColumn]: { halign: "right", cellWidth: 34 } },
    didParseCell: (data) => {
      if (data.section === "foot" && data.row.index === foot.length - 1) {
        data.cell.styles.fillColor = primary;
        data.cell.styles.textColor = WHITE;
        data.cell.styles.fontStyle = "bold";
      }
      if (data.column.index === lastColumn) data.cell.styles.halign = "right";
    },
  });
  return (pdf as PdfWithTable).lastAutoTable?.finalY ?? startY + 20;
}

/** Signature block geometry (mm). */
const SIGNATURE = {
  /** Blank space above the line reserved for the handwritten signature (~62 pt). */
  signingSpace: 22,
  columnWidth: 64,
  leftX: 22,
  rightX: 124,
  /** Total height needed: intro + signing space + role, name and two detail lines. */
  blockHeight: 62,
};

function drawSignatureParty(
  pdf: jsPDF,
  party: SignatureParty,
  x: number,
  lineY: number,
  primary: Rgb,
  secondary: Rgb,
): void {
  const center = x + SIGNATURE.columnWidth / 2;
  pdf.setDrawColor(...secondary);
  pdf.setLineWidth(0.4);
  pdf.line(x, lineY, x + SIGNATURE.columnWidth, lineY);

  let y = lineY + 6;
  pdf.setTextColor(...primary);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.text(party.role, center, y, { align: "center", charSpace: 0.4 });

  if (party.name) {
    y += 6;
    pdf.setTextColor(...INK);
    pdf.setFontSize(10.5);
    const nameLines = pdf.splitTextToSize(party.name, SIGNATURE.columnWidth) as string[];
    pdf.text(nameLines, center, y, { align: "center" });
    y += (nameLines.length - 1) * 4.6;
  }

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...MUTED);
  for (const detail of party.details) {
    y += 5;
    pdf.text(detail, center, y, { align: "center" });
  }
}

function addSignatures(
  pdf: jsPDF,
  quote: FeeQuote,
  studio: StudioProfile,
  primary: Rgb,
  secondary: Rgb,
  y: number,
  startNewPage: () => void,
): void {
  const footerTop = pdf.internal.pageSize.getHeight() - 17;
  if (y + SIGNATURE.blockHeight > footerTop - 4) {
    startNewPage();
    y = 40;
  }

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...MUTED);
  pdf.text("En señal de conformidad, ambas partes suscriben la presente propuesta.", 18, y);

  const lineY = y + 6 + SIGNATURE.signingSpace;
  const [contractor, designer] = signatureParties(quote, studio);
  drawSignatureParty(pdf, contractor, SIGNATURE.leftX, lineY, primary, secondary);
  drawSignatureParty(pdf, designer, SIGNATURE.rightX, lineY, primary, secondary);
}

export function buildProposalPdf(
  quote: FeeQuote,
  result: FeeQuoteResult,
  options: ProposalOptions,
): jsPDF {
  const studio = studioFrom(options);
  const primary = parseHex(studio.brandPrimary, [19, 41, 75]);
  const secondary = parseHex(studio.brandSecondary, [197, 155, 39]);
  const soft = tint(primary, 0.06);
  const date = dateLabel(options.date ?? new Date());
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: false });
  addCover(pdf, quote, studio, date, primary, secondary);
  if (options.watermark) drawWatermark(pdf);
  pdf.addPage();
  let y = 32;
  addContentHeader(pdf, studio, date, primary, secondary);
  y = sectionTitle(pdf, "01", "Resumen del proyecto", y, primary, secondary);
  autoTable(pdf, {
    startY: y,
    margin: { left: 18, right: 18 },
    body: [
      [
        "Tipología",
        typologyLabel(quote.input.typology),
        "Área techada",
        quote.input.areaM2.toFixed(2) + " m²",
      ],
      ["Pisos", String(quote.input.floors), "Ubicación", quote.location || "—"],
      ["Plazo total", quote.input.weeks + " semanas", "Documento", quote.code],
    ],
    theme: "plain",
    styles: { font: "helvetica", fontSize: 9, textColor: INK, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: "bold", textColor: MUTED, cellWidth: 30 },
      2: { fontStyle: "bold", textColor: MUTED, cellWidth: 30 },
    },
  });
  y = (pdf as PdfWithTable).lastAutoTable?.finalY ?? y + 24;
  y += 10;
  y = sectionTitle(pdf, "02", "Propuesta económica", y, primary, secondary);
  const foot: string[][] = [["", "Subtotal", formatPen(result.subtotal)]];
  if (result.taxLabel === "IGV 18%") foot.push(["", "IGV 18%", formatPen(result.taxAmount)]);
  else {
    foot.push(["", "Recibo por Honorarios", "—"]);
    if (result.retention > 0)
      foot.push(["", "Retención 8% (si aplica)", "- " + formatPen(result.retention)]);
  }
  foot.push(["", "TOTAL", formatPen(result.total)]);
  y =
    proposalTable(
      pdf,
      y,
      [["Ítem", "Detalle", "Subtotal"]],
      result.lines.map((line) => [line.label, lineDetailForProposal(line), formatPen(line.amount)]),
      foot,
      primary,
      soft,
    ) + 10;
  const amounts = paymentAmounts(result.total, quote.payment.installments);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...primary);
  const cards = quote.payment.installments.slice(0, 3);
  const cardWidth = 174 / Math.max(cards.length, 1);
  cards.forEach((installment, index) => {
    const x = 18 + index * cardWidth;
    pdf.setFillColor(...soft);
    pdf.roundedRect(x, y, cardWidth - 5, 22, 2, 2, "F");
    pdf.text(index === 0 ? "ADELANTO (40%)" : "SALDO · " + installment.pct + "%", x + 4, y + 7);
    pdf.setTextColor(...INK);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(formatPen(amounts[index] ?? 0), x + 4, y + 16);
    pdf.setTextColor(...primary);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
  });
  y += 32;
  y = sectionTitle(pdf, "03", "Alcance y entregables", y, primary, secondary);
  for (const group of groupDeliverables(quote.input, quote.deliverables)) {
    if (y > 260) {
      pdf.addPage();
      addContentHeader(pdf, studio, date, primary, secondary);
      y = 32;
    }
    pdf.setTextColor(...primary);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text(group.group, 22, y);
    y += 5;
    pdf.setTextColor(...INK);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    for (const item of group.items) {
      // Square bullet drawn as a shape: "▪" is not in the standard PDF fonts.
      const lines = pdf.splitTextToSize(item, 160) as string[];
      pdf.setFillColor(...secondary);
      pdf.rect(25, y - 2.1, 1.6, 1.6, "F");
      pdf.text(lines, 29, y);
      y += lines.length * 4 + 2;
    }
    y += 2;
  }
  y += 4;
  if (y > 245) {
    pdf.addPage();
    addContentHeader(pdf, studio, date, primary, secondary);
    y = 32;
  }
  y = sectionTitle(pdf, "04", "Cronograma", y, primary, secondary);
  y =
    proposalTable(
      pdf,
      y,
      [["Hito", "Semanas", "Duración"]],
      quote.schedule.map((item) => [
        item.label,
        formatWeekRange(item),
        item.toWeek -
          item.fromWeek +
          1 +
          (item.toWeek - item.fromWeek === 0 ? " semana" : " semanas"),
      ]),
      [],
      primary,
      soft,
    ) + 10;
  if (y > 245) {
    pdf.addPage();
    addContentHeader(pdf, studio, date, primary, secondary);
    y = 32;
  }
  y = sectionTitle(pdf, "05", "Forma de pago", y, primary, secondary);
  y =
    proposalTable(
      pdf,
      y,
      [["Armada", "Concepto", "%", "Monto"]],
      quote.payment.installments.map((item, index) => [
        item.label,
        index === 0 ? "Adelanto" : "Saldo",
        item.pct + "%",
        formatPen(amounts[index] ?? 0),
      ]),
      [],
      primary,
      soft,
    ) + 10;
  if (y > 245) {
    pdf.addPage();
    addContentHeader(pdf, studio, date, primary, secondary);
    y = 32;
  }
  y = sectionTitle(pdf, "06", "Condiciones y cláusulas", y, primary, secondary);
  pdf.setTextColor(...INK);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  for (const [index, condition] of quote.conditions.entries()) {
    const lines = pdf.splitTextToSize(index + 1 + ". " + condition, 170) as string[];
    pdf.text(lines, 21, y);
    y += lines.length * 4.5 + 3;
  }
  addSignatures(pdf, quote, studio, primary, secondary, y + 10, () => {
    pdf.addPage();
    addContentHeader(pdf, studio, date, primary, secondary);
  });
  const totalPages = pdf.getNumberOfPages();
  for (let page = 2; page <= totalPages; page += 1) {
    pdf.setPage(page);
    drawFooter(pdf, studio, date, page, totalPages, secondary, options.watermark);
  }
  if (options.watermark) {
    for (let page = 2; page <= totalPages; page += 1) {
      pdf.setPage(page);
      drawWatermark(pdf);
    }
  }
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
