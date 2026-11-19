import path from "node:path";
import sharp from "sharp";

/**
 * Shared brand constants for the icon and preview generators.
 *
 * assets/logo.png is the official mark: the gold T on a transparent background.
 * Everything that needs a solid tile (app icons, maskable icons, link previews)
 * places it on BRAND_GROUND, the app's dark background, so no platform ever fills
 * the transparency with its own black or white square.
 */
export const LOGO = path.join(process.cwd(), "assets", "logo.png");
export const BRAND_GROUND = "#0f1115";
export const BRAND_GOLD = "#d4a359";

/** The T alone: the logo trimmed to its artwork, without the transparent margin. */
let artwork;
async function trimmed() {
  artwork ??= await sharp(LOGO).trim({ threshold: 1 }).png().toBuffer({ resolveWithObject: true });
  return artwork;
}

/**
 * The T fitted inside a transparent `size` × `size` square, its longest side taking
 * `fraction` of the square and centred on both axes.
 */
export async function mark(size, fraction = 1) {
  const { data } = await trimmed();
  const inner = Math.round(size * fraction);
  const fitted = await sharp(data)
    .resize(inner, inner, { fit: "inside", kernel: "lanczos3" })
    .png()
    .toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: fitted, gravity: "center" }])
    .png()
    .toBuffer();
}

/**
 * The T on the brand ground. Square tiles come out fully opaque with no alpha channel:
 * iOS and some Android launchers fill transparency with black. `radius` rounds the
 * corners (and keeps alpha outside them) for the browser-tab favicon only.
 */
export async function tile(size, fraction, radius = 0) {
  const ground = sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="${BRAND_GROUND}"/></svg>`,
    ),
  );
  const composed = await ground
    .composite([{ input: await mark(size, fraction) }])
    .png()
    .toBuffer();
  const output = sharp(composed);
  return (radius ? output : output.removeAlpha()).png({ compressionLevel: 9 }).toBuffer();
}
