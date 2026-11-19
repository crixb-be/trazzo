import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * Every TRAZO icon comes from one source: assets/logo.png (square, 1024 px).
 * The same file feeds the native icons through `npx capacitor-assets generate`.
 */
const root = process.cwd();
const source = path.join(root, "assets", "logo.png");
const icons = path.join(root, "public", "icons");
const brand = path.join(root, "public", "brand");
/** Background of the logo artwork; pads the maskable icons. */
const background = "#151920";

await mkdir(icons, { recursive: true });
await mkdir(brand, { recursive: true });

const { width = 1024 } = await sharp(source).metadata();

async function square(name, size, directory = icons) {
  await sharp(source)
    .resize(size, size, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(directory, name));
}

// Maskable icons are cropped to a circle by Android: shrink the artwork to 80 %
// so the corners of the T stay inside the safe zone.
async function maskable(name, size) {
  const inner = Math.round(size * 0.8);
  const artwork = await sharp(source).resize(inner, inner).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 3, background } })
    .composite([{ input: artwork, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(icons, name));
}

await square("icon-192.png", 192);
await square("icon-512.png", 512);
await maskable("icon-192-maskable.png", 192);
await maskable("icon-512-maskable.png", 512);
await square("apple-touch-icon.png", 180);
await square("favicon-32.png", 32);

// The UI mark is shown at ~34 px: crop the margin so the T reads at that size.
const crop = Math.round(width * 0.72);
const offset = Math.round((width - crop) / 2);
await sharp(source)
  .extract({ left: offset, top: offset - Math.round(width * 0.02), width: crop, height: crop })
  .resize(136, 136)
  .png({ compressionLevel: 9 })
  .toFile(path.join(brand, "trazo-mark.png"));

console.log("Iconos generados desde assets/logo.png");
