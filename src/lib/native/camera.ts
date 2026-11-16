/** Site photos: the native camera inside the app, the phone's camera picker on the web. */

export const PHOTO_MAX_SIDE = 1280;
export const PHOTO_QUALITY = 0.72;

/** Scales a picture down so its longest side is at most `max`; never enlarges. */
export function fitWithin(
  width: number,
  height: number,
  max: number = PHOTO_MAX_SIDE,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= max || longest === 0) return { width, height };
  const scale = max / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export async function isNativeApp(): Promise<boolean> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Opens the device camera through the Capacitor plugin. Returns a JPEG data
 * URL, or null when the user cancels or the plugin is not available.
 */
export async function takeNativePhoto(): Promise<string | null> {
  try {
    const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
    const photo = await Camera.getPhoto({
      source: CameraSource.Camera,
      resultType: CameraResultType.DataUrl,
      quality: Math.round(PHOTO_QUALITY * 100),
      width: PHOTO_MAX_SIDE,
      height: PHOTO_MAX_SIDE,
      correctOrientation: true,
    });
    return photo.dataUrl ?? null;
  } catch {
    return null;
  }
}

/** Shrinks a picked or captured image file to a storable JPEG data URL. */
export async function fileToPhotoDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const size = fitWithin(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas");
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", PHOTO_QUALITY);
}
