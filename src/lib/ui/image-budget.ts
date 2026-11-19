"use client";

import { dataUrlBytes, type ImageCompressor } from "@/lib/offline/profile-sync";

/** Longest side tried, largest first, until the image fits its byte budget. */
export const SIZE_STEPS = [512, 448, 384, 320, 256, 192] as const;

/** Sizes worth trying for an image whose longest side is `longest` (never upscales). */
export function sizeSteps(longest: number): number[] {
  const steps = SIZE_STEPS.filter((size) => size <= longest);
  return steps.length ? steps : [Math.max(1, Math.round(longest))];
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("No se pudo leer la imagen."));
    element.src = src;
  });
}

function draw(
  image: HTMLImageElement,
  longest: number,
  type: "image/png" | "image/jpeg",
  quality?: number,
): string {
  const width = image.naturalWidth || longest;
  const height = image.naturalHeight || longest;
  const scale = Math.min(1, longest / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudo preparar la imagen.");
  if (type === "image/jpeg") {
    // JPEG has no transparency: paint white behind it, as on the proposal page.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(type, quality);
}

/**
 * The largest rendering of `image` under `maxBytes`. Transparent logos stay PNG while
 * any size fits; only a photo-like logo that never fits falls back to JPEG.
 */
export function shrinkToBudget(
  image: HTMLImageElement,
  maxBytes: number,
  keepTransparency: boolean,
): string | null {
  const longest = Math.max(image.naturalWidth || 512, image.naturalHeight || 512);
  const steps = sizeSteps(longest);
  if (keepTransparency) {
    for (const size of steps) {
      const png = draw(image, size, "image/png");
      if (dataUrlBytes(png) <= maxBytes) return png;
    }
  }
  for (const size of steps) {
    const jpeg = draw(image, size, "image/jpeg", 0.86);
    if (dataUrlBytes(jpeg) <= maxBytes) return jpeg;
  }
  const last = draw(image, 160, "image/jpeg", 0.75);
  return dataUrlBytes(last) <= maxBytes ? last : null;
}

/** Recompresses an image already stored on the device (e.g. a logo saved before limits). */
export const compressImageForSync: ImageCompressor = async (dataUrl, maxBytes) => {
  if (typeof document === "undefined") return null;
  const image = await loadImage(dataUrl);
  return shrinkToBudget(image, maxBytes, !dataUrl.startsWith("data:image/jpeg"));
};

export { loadImage };
