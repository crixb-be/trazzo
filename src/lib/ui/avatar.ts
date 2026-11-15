"use client";

/** Side, in pixels, of the square profile photo kept on the device. */
export const AVATAR_SIZE = 256;
/** Phone photos are large; they are shrunk before saving, so allow up to 15 MB. */
export const AVATAR_MAX_BYTES = 15 * 1024 * 1024;

export interface SquareCrop {
  sx: number;
  sy: number;
  side: number;
}

/** Centered square crop of a width × height image (the largest square that fits). */
export function centeredSquareCrop(width: number, height: number): SquareCrop {
  const side = Math.max(1, Math.min(width, height));
  return {
    sx: Math.max(0, Math.round((width - side) / 2)),
    sy: Math.max(0, Math.round((height - side) / 2)),
    side,
  };
}

export function validateAvatarFile(file: Pick<File, "type" | "size" | "name">): string | null {
  const looksLikeImage =
    file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|heic|heif|avif|bmp)$/i.test(file.name);
  if (!looksLikeImage) return "La foto de perfil debe ser una imagen (JPG, PNG, WebP…).";
  if (file.size > AVATAR_MAX_BYTES) return "La foto no puede superar 15 MB.";
  return null;
}

/**
 * Turns a picked photo (camera, gallery or file) into a small square JPEG data
 * URL, centered on the image, so it can live in IndexedDB and in the header.
 */
export async function prepareAvatar(file: File): Promise<string> {
  const invalid = validateAvatarFile(file);
  if (invalid) throw new Error(invalid);

  const source = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () =>
        reject(
          new Error("No se pudo leer la imagen. Prueba con una foto JPG o PNG desde tu galería."),
        );
      element.src = source;
    });
    const width = image.naturalWidth || AVATAR_SIZE;
    const height = image.naturalHeight || AVATAR_SIZE;
    const crop = centeredSquareCrop(width, height);
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo preparar la foto.");
    // JPEG has no transparency: paint white behind transparent PNGs.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
    context.imageSmoothingQuality = "high";
    context.drawImage(
      image,
      crop.sx,
      crop.sy,
      crop.side,
      crop.side,
      0,
      0,
      AVATAR_SIZE,
      AVATAR_SIZE,
    );
    return canvas.toDataURL("image/jpeg", 0.88);
  } finally {
    URL.revokeObjectURL(source);
  }
}
