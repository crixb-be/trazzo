import type { jsPDF } from "jspdf";

export function addFittedPdfImage(
  pdf: jsPDF,
  dataUrl: string,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
): void {
  const { width, height, fileType } = pdf.getImageProperties(dataUrl);
  const ratio = Math.min(maxWidth / width, maxHeight / height);
  pdf.addImage(dataUrl, fileType, x, y, width * ratio, height * ratio);
}
