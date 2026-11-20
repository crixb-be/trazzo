import {
  sheetDate,
  WATERMARK_TEXT,
  wrapText,
  type ResultSheet,
  type SheetBrand,
} from "./result-sheet";

/** Portrait width that WhatsApp shows sharp without recompressing too hard. */
const WIDTH = 1080;
const MARGIN = 64;
const SANS = "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, Menlo, monospace";

type Paint = (ctx: CanvasRenderingContext2D) => void;

function loadImage(source: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = source;
  });
}

function readableOn(hex: string): string {
  const value = parseInt(hex.slice(1), 16);
  const luminance =
    0.299 * ((value >> 16) & 255) + 0.587 * ((value >> 8) & 255) + 0.114 * (value & 255);
  return luminance > 150 ? "#111111" : "#ffffff";
}

/**
 * Draws the sheet on a canvas and returns it as a PNG. Layout runs first as a
 * list of paint steps so the canvas can be created at the exact final height.
 */
export async function renderSheetImage(
  sheet: ResultSheet,
  brand: SheetBrand,
  diagram?: { image: CanvasImageSource; width: number; height: number; background: string } | null,
): Promise<Blob> {
  const measureCanvas = document.createElement("canvas");
  const measure = measureCanvas.getContext("2d");
  if (!measure) throw new Error("canvas");
  const paints: Paint[] = [];
  const inner = WIDTH - MARGIN * 2;
  let y = 0;

  function text(
    value: string,
    font: string,
    color: string,
    lineHeight: number,
    x = MARGIN,
    width = inner,
  ): void {
    measure!.font = font;
    for (const line of wrapText(
      value,
      width,
      (candidate) => measure!.measureText(candidate).width,
    )) {
      const baseline = y + lineHeight * 0.78;
      paints.push((ctx) => {
        ctx.font = font;
        ctx.fillStyle = color;
        ctx.fillText(line, x, baseline);
      });
      y += lineHeight;
    }
  }

  // Brand band.
  const logo = brand.logoDataUrl ? await loadImage(brand.logoDataUrl) : null;
  const bandHeight = 168;
  const onPrimary = readableOn(brand.primary);
  paints.push((ctx) => {
    ctx.fillStyle = brand.primary;
    ctx.fillRect(0, 0, WIDTH, bandHeight);
    ctx.fillStyle = brand.secondary;
    ctx.fillRect(0, bandHeight, WIDTH, 8);
    let textX = MARGIN;
    if (logo) {
      const box = 104;
      const scale = Math.min(box / logo.width, box / logo.height);
      const w = logo.width * scale;
      const h = logo.height * scale;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(MARGIN, (bandHeight - box) / 2, box, box);
      ctx.drawImage(logo, MARGIN + (box - w) / 2, (bandHeight - h) / 2, w, h);
      textX = MARGIN + box + 28;
    }
    ctx.fillStyle = onPrimary;
    ctx.font = "700 44px " + SANS;
    ctx.fillText(brand.name, textX, brand.byline ? 84 : 100, WIDTH - textX - MARGIN);
    if (brand.byline) {
      ctx.font = "400 28px " + SANS;
      ctx.fillText(brand.byline, textX, 126, WIDTH - textX - MARGIN);
    }
  });
  y = bandHeight + 8 + 56;

  text(sheet.eyebrow, "500 26px " + MONO, "#8a5a12", 38);
  y += 8;
  text(sheet.title, "700 68px " + SANS, "#111111", 80);
  y += 10;
  if (sheet.subtitle) text(sheet.subtitle, "400 34px " + SANS, "#333333", 48);
  y += 28;

  if (diagram) {
    const scale = Math.min(inner / diagram.width, 620 / diagram.height);
    const w = diagram.width * scale;
    const h = diagram.height * scale;
    const top = y;
    paints.push((ctx) => {
      ctx.fillStyle = diagram.background;
      ctx.fillRect(MARGIN, top, inner, h + 32);
      ctx.drawImage(diagram.image, MARGIN + (inner - w) / 2, top + 16, w, h);
    });
    y += h + 32 + 32;
  }

  for (const row of sheet.rows) {
    const top = y;
    const mark = row.status === "ok" ? "✓" : row.status === "fail" ? "✗" : "";
    const labelX = MARGIN + (mark ? 52 : 0);
    const valueWidth = 330;
    paints.push((ctx) => {
      ctx.strokeStyle = "#d9d6cf";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(MARGIN, top);
      ctx.lineTo(WIDTH - MARGIN, top);
      ctx.stroke();
      if (mark) {
        ctx.font = "700 36px " + SANS;
        ctx.fillStyle = row.status === "ok" ? "#15803d" : "#b91c1c";
        ctx.fillText(mark, MARGIN, top + 52);
      }
    });
    y += 16;
    const startY = y;
    text(
      row.label,
      "400 32px " + SANS,
      "#222222",
      44,
      labelX,
      inner - valueWidth - (mark ? 52 : 0) - 24,
    );
    const afterLabel = y;
    y = startY;
    measure.font = "600 32px " + MONO;
    for (const line of wrapText(row.value, valueWidth, (c) => measure.measureText(c).width)) {
      const baseline = y + 44 * 0.78;
      paints.push((ctx) => {
        ctx.font = "600 32px " + MONO;
        ctx.fillStyle = row.status === "fail" ? "#b91c1c" : "#111111";
        ctx.textAlign = "right";
        ctx.fillText(line, WIDTH - MARGIN, baseline);
        ctx.textAlign = "left";
      });
      y += 44;
    }
    y = Math.max(y, afterLabel) + 16;
  }
  if (sheet.rows.length) y += 20;

  for (const note of sheet.notes) {
    text(note, "400 30px " + SANS, "#333333", 44);
    y += 18;
  }

  y += 20;
  const footerTop = y;
  paints.push((ctx) => {
    ctx.fillStyle = "#f1efe9";
    ctx.fillRect(0, footerTop, WIDTH, 100000);
  });
  y += 36;
  text(sheet.disclaimer, "400 24px " + SANS, "#555555", 34);
  y += 14;
  text(
    sheetDate() + (brand.watermark ? " · " + WATERMARK_TEXT : " · trazzo"),
    "500 24px " + MONO,
    "#555555",
    34,
  );
  y += 40;

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = Math.ceil(y);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textBaseline = "alphabetic";
  for (const paint of paints) paint(ctx);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("png"))), "image/png");
  });
}

/**
 * Rasterises an on-page SVG plate. Its look comes from the stylesheet, so the
 * computed presentation styles are copied onto a clone before serialising.
 */
export async function captureDiagram(
  svg: SVGSVGElement | null,
): Promise<{ image: HTMLCanvasElement; width: number; height: number; background: string } | null> {
  if (!svg) return null;
  try {
    const box = svg.getBoundingClientRect();
    if (box.width < 2 || box.height < 2) return null;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    const properties = [
      "fill",
      "fill-opacity",
      "stroke",
      "stroke-width",
      "stroke-dasharray",
      "stroke-linecap",
      "stroke-linejoin",
      "stroke-opacity",
      "opacity",
      "font-family",
      "font-size",
      "font-weight",
      "letter-spacing",
      "text-anchor",
      "dominant-baseline",
      "visibility",
      "display",
    ];
    const originals = [svg, ...Array.from(svg.querySelectorAll<SVGElement>("*"))];
    const copies = [clone, ...Array.from(clone.querySelectorAll<SVGElement>("*"))];
    originals.forEach((element, index) => {
      const computed = getComputedStyle(element);
      const target = copies[index];
      for (const property of properties) {
        target.style.setProperty(property, computed.getPropertyValue(property));
      }
    });
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(box.width));
    clone.setAttribute("height", String(box.height));
    const source =
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(new XMLSerializer().serializeToString(clone));
    const image = await loadImage(source);
    if (!image) return null;
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(box.width * scale);
    canvas.height = Math.round(box.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const plate = svg.closest(".diagram-frame") ?? svg.parentElement;
    let background = plate ? getComputedStyle(plate).backgroundColor : "";
    if (!background || background === "rgba(0, 0, 0, 0)") {
      background = getComputedStyle(document.body).backgroundColor;
    }
    return { image: canvas, width: canvas.width, height: canvas.height, background };
  } catch {
    return null;
  }
}
