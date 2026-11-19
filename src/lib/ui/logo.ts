"use client";

import { MAX_SYNC_IMAGE_BYTES } from "@/lib/offline/profile-sync";
import { loadImage, shrinkToBudget } from "./image-budget";

/**
 * Turns the picked studio logo into a data URL under 150 KB: small enough for the
 * proposal PDF, IndexedDB and the Supabase profile row. Transparency is kept (PNG)
 * whenever a size fits.
 */
export async function prepareLogo(file: File): Promise<string> {
  if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type)) {
    throw new Error("El logo debe ser PNG, JPG, WebP o SVG.");
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("El logo no puede superar 2 MB.");
  }

  const source = URL.createObjectURL(file);
  try {
    const image = await loadImage(source).catch(() => {
      throw new Error("No se pudo leer el logo.");
    });
    const fitted = shrinkToBudget(image, MAX_SYNC_IMAGE_BYTES, file.type !== "image/jpeg");
    if (!fitted) throw new Error("No se pudo reducir el logo. Prueba con una imagen más simple.");
    return fitted;
  } finally {
    URL.revokeObjectURL(source);
  }
}
