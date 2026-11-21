import type { Project, SiteLog, SiteVisitType, StudioProfile } from "@/lib/offline/db";
import { SITE_LOG_SECTIONS, SITE_LOG_TOPICS, VISIT_TYPES } from "@/lib/projects/site-log";
import { addFittedPdfImage } from "./images";

const reportTitles: Record<SiteVisitType, string> = {
  apertura: "Acta de apertura de obra",
  visita: "Informe de visita de obra",
  cierre: "Acta de cierre de obra",
};

export function buildSiteLogReport(log: SiteLog, project: Project | null, studio: StudioProfile) {
  const slug = (project?.name ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const professional = studio.fullName.trim();
  const cap = studio.capNumber.trim();
  return {
    title: reportTitles[log.visitType],
    filename:
      "bitacora-" +
      (slug || (project ? "proyecto" : log.projectId ? "proyecto-eliminado" : "sin-proyecto")) +
      "-" +
      log.visitDate +
      ".pdf",
    letterhead: {
      name: studio.studioName.trim() || "TRAZZO",
      logo: studio.logoDataUrl,
      fields: [
        studio.ruc.trim() && "RUC " + studio.ruc.trim(),
        studio.address.trim(),
        [professional, cap && "CAP " + cap].filter(Boolean).join(" · "),
      ].filter(Boolean),
    },
    fields: [
      {
        label: "Proyecto",
        value: project?.name || (log.projectId ? "Proyecto eliminado" : "Sin proyecto"),
      },
      { label: "Ubicación", value: project?.location || "Sin registrar" },
      { label: "Tipología", value: project?.typology || "Sin registrar" },
      { label: "Tipo de visita", value: VISIT_TYPES[log.visitType] },
      { label: "Fecha", value: log.visitDate.split("-").reverse().join("/") },
      { label: "Asistentes", value: log.attendees.trim() || "Sin registrar" },
    ],
    sections: (Object.keys(SITE_LOG_SECTIONS) as Array<keyof typeof SITE_LOG_SECTIONS>).map(
      (key) => ({
        title: SITE_LOG_SECTIONS[key],
        text: log[key].trim() || "Sin observaciones",
      }),
    ),
    topics: log.topics.map((topic) => SITE_LOG_TOPICS[topic]),
    photos: log.photos.map((photo) => ({ ...photo })),
    signature: [professional || "Proyectista", cap && "CAP " + cap].filter(Boolean).join(" · "),
    disclaimer:
      "Registro de la visita para seguimiento de obra. Verifica la información antes de incorporarla al expediente.",
  };
}

export async function exportSiteLogPdf(
  log: SiteLog,
  project: Project | null,
  studio: StudioProfile,
  watermark: boolean,
) {
  const { jsPDF } = await import("jspdf");
  const report = buildSiteLogReport(log, project, studio);
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 16;
  const width = pdf.internal.pageSize.getWidth();
  const height = pdf.internal.pageSize.getHeight();
  const inner = width - margin * 2;
  const bottom = height - 24;
  const brand = (color: string, fallback: string) =>
    /^#[\da-f]{6}$/i.test(color) ? color : fallback;
  const primary = brand(studio.brandPrimary, "#13294B");
  let y = margin;

  function ensure(space: number): void {
    if (y + space <= bottom) return;
    pdf.addPage();
    y = margin;
  }

  function paragraph(text: string, size = 10, bold = false, x = margin, maxWidth = inner) {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    pdf.setTextColor(bold ? primary : "#1a1b1f");
    const lineHeight = size * 0.45;
    for (const line of pdf.splitTextToSize(text, maxWidth) as string[]) {
      ensure(lineHeight);
      pdf.text(line, x, y + lineHeight * 0.8);
      y += lineHeight;
    }
  }

  let headerX = margin;
  if (report.letterhead.logo) {
    try {
      addFittedPdfImage(pdf, report.letterhead.logo, margin, y, 22, 23);
      headerX += 28;
    } catch {
      // The studio name still identifies the report if the image cannot be read.
    }
  }
  paragraph(report.letterhead.name, 16, true, headerX, width - margin - headerX);
  for (const field of report.letterhead.fields)
    paragraph(field, 9, false, headerX, width - margin - headerX);
  y = Math.max(y, margin + 23) + 3;
  pdf.setDrawColor(brand(studio.brandSecondary, "#C59B27"));
  pdf.line(margin, y, width - margin, y);
  y += 6;
  paragraph(report.title, 19, true);
  y += 4;
  for (const field of report.fields) paragraph(field.label + ": " + field.value);
  y += 5;
  for (const section of report.sections) {
    ensure(13);
    paragraph(section.title, 11, true);
    paragraph(section.text);
    y += 4;
  }
  ensure(13);
  paragraph("Temas tratados", 11, true);
  paragraph(report.topics.join(" · ") || "Sin temas registrados");
  y += 5;

  if (report.photos.length) {
    const gutter = 6;
    const cellWidth = (inner - gutter) / 2;
    const photoHeight = 48;
    ensure(photoHeight + 20);
    paragraph("Registro fotográfico", 11, true);
    y += 3;
    for (let i = 0; i < report.photos.length; i += 2) {
      ensure(photoHeight + 10);
      const top = y;
      const pair = report.photos.slice(i, i + 2);
      pair.forEach((photo, column) => {
        const x = margin + column * (cellWidth + gutter);
        try {
          addFittedPdfImage(pdf, photo.dataUrl, x, top, cellWidth, photoHeight);
        } catch {
          pdf.setFontSize(9);
          pdf.text("Imagen no disponible", x, top + 8);
        }
      });
      y += photoHeight + 2;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor("#1a1b1f");
      const captions = pair.map(
        (photo, column) =>
          pdf.splitTextToSize(
            i + column + 1 + ". " + (photo.caption.trim() || "Sin descripción"),
            cellWidth,
          ) as string[],
      );
      for (let line = 0; line < Math.max(...captions.map((caption) => caption.length)); line++) {
        ensure(4);
        captions.forEach((caption, column) => {
          if (caption[line]) pdf.text(caption[line], margin + column * (cellWidth + gutter), y + 3);
        });
        y += 4;
      }
      y += 5;
    }
  }

  ensure(28);
  y += 13;
  pdf.setDrawColor("#1a1b1f");
  pdf.line(margin, y, margin + 72, y);
  y += 2;
  paragraph(report.signature, 10, true);
  paragraph("Firma del proyectista", 9);
  y += 5;
  paragraph(report.disclaimer, 8);
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor("#555555");
    pdf.setFontSize(8);
    pdf.text("Página " + page + " de " + pages, width - margin, height - 12, { align: "right" });
    if (watermark) {
      pdf.setTextColor(200, 200, 200);
      pdf.setFontSize(46);
      pdf.text("TRAZZO GRATIS", width / 2, 160, { align: "center", angle: 35 });
    }
  }
  pdf.save(report.filename);
}
