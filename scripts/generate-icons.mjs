import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { BRAND_GROUND, LOGO, mark, tile } from "./brand.mjs";

/**
 * Every TRAZO icon comes from one source: assets/logo.png, the gold T on transparency.
 * The same file feeds the native icons through `npm run icons:native`, which lays it on
 * the same BRAND_GROUND (#0f1115).
 *
 *   public/brand/trazo-mark.png   transparent; the in-app mark (sidebar, header, login,
 *                                 avatars), tinted per theme through a CSS mask
 *   public/icons/*                opaque tiles on BRAND_GROUND for the OS and browsers
 */
const root = process.cwd();
const icons = path.join(root, "public", "icons");
const brand = path.join(root, "public", "brand");

await mkdir(icons, { recursive: true });
await mkdir(brand, { recursive: true });

const { width, height, hasAlpha } = await sharp(LOGO).metadata();
if (!hasAlpha) {
  console.warn("Aviso: assets/logo.png no tiene transparencia; se esperaba el logo sin fondo.");
}

async function save(directory, name, buffer) {
  await writeFile(path.join(directory, name), buffer);
}

// "any" icons and the Apple touch icon: the T takes 62 % of the tile, like the native
// iOS icon, and the platform rounds the corners itself.
await save(icons, "icon-192.png", await tile(192, 0.62));
await save(icons, "icon-512.png", await tile(512, 0.62));
await save(icons, "apple-touch-icon.png", await tile(180, 0.62));

// Maskable icons are cropped by Android to a circle of 80 % of the tile: at 54 % the
// corners of the T stay inside that safe zone.
await save(icons, "icon-192-maskable.png", await tile(192, 0.54));
await save(icons, "icon-512-maskable.png", await tile(512, 0.54));

// Browser tab: a small rounded tile so the T reads on light and dark tab strips.
await save(icons, "favicon-32.png", await tile(32, 0.74, 7));

// In-app mark: shown at up to 84 px, so 256 px keeps it sharp on 3× screens.
await sharp(await mark(256, 0.94))
  .png({ compressionLevel: 9 })
  .toFile(path.join(brand, "trazo-mark.png"));

console.log(`Iconos generados desde assets/logo.png (${width}×${height}) sobre ${BRAND_GROUND}`);
