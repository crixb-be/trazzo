"use client";

export async function prepareLogo(file: File): Promise<string> {
  if (!["image/png", "image/jpeg", "image/svg+xml"].includes(file.type)) {
    throw new Error("El logo debe ser PNG, JPEG o SVG.");
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("El logo no puede superar 2 MB.");
  }

  const source = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("No se pudo leer el logo."));
      element.src = source;
    });
    const longest = Math.max(image.naturalWidth || 512, image.naturalHeight || 512);
    const scale = Math.min(1, 512 / longest);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round((image.naturalWidth || 512) * scale));
    canvas.height = Math.max(1, Math.round((image.naturalHeight || 512) * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo preparar el logo.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(source);
  }
}
