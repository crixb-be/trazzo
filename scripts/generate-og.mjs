import path from "node:path";
import sharp from "sharp";
import { BRAND_GOLD, BRAND_GROUND, mark } from "./brand.mjs";

/**
 * Link previews (WhatsApp, Telegram, social networks) from assets/logo.png. The logo is
 * transparent, so both previews lay it on the brand ground (#0f1115):
 *   public/og-image.png  1200×630  logo, name and tagline on drafting paper
 *   public/og-square.png  512×512  compact thumbnail for chat apps
 */
const root = process.cwd();
const ground = BRAND_GROUND;
const gold = BRAND_GOLD;
const ink = "#ece9e3";
const font = "Inter, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

/** Drafting-paper grid: minor every 24 px, major every 120 px, faded toward the edges. */
function paper(width, height) {
  const lines = [];
  for (let x = 0; x <= width; x += 24)
    lines.push(
      `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="${gold}" stroke-opacity="${x % 120 === 0 ? 0.1 : 0.045}"/>`,
    );
  for (let y = 0; y <= height; y += 24)
    lines.push(
      `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="${gold}" stroke-opacity="${y % 120 === 0 ? 0.1 : 0.045}"/>`,
    );
  return `
    <defs>
      <radialGradient id="fade" cx="50%" cy="42%" r="65%">
        <stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/>
      </radialGradient>
      <mask id="m"><rect width="${width}" height="${height}" fill="url(#fade)"/></mask>
      <radialGradient id="glow" cx="50%" cy="38%" r="55%">
        <stop offset="0" stop-color="${gold}" stop-opacity="0.16"/>
        <stop offset="1" stop-color="${gold}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="${ground}"/>
    <g mask="url(#m)">${lines.join("")}</g>
    <rect width="${width}" height="${height}" fill="url(#glow)"/>`;
}

// 1200 × 630: logo centred, wordmark and tagline below.
const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  ${paper(1200, 630)}
  <text x="600" y="468" text-anchor="middle" font-family="${font}" font-size="68" font-weight="700" letter-spacing="8" fill="${ink}">TRAZZO</text>
  <text x="600" y="522" text-anchor="middle" font-family="${font}" font-size="30" font-weight="500" fill="${gold}">Del estudio a la obra</text>
  <text x="600" y="582" text-anchor="middle" font-family="${font}" font-size="18" fill="${ink}" fill-opacity="0.55">Normativa RNE · calculadoras · metrados · honorarios</text>
</svg>`;
await sharp(Buffer.from(wide))
  .composite([{ input: await mark(320), left: 440, top: 84 }])
  .png({ compressionLevel: 9 })
  .toFile(path.join(root, "public", "og-image.png"));

// 512 × 512: the logo centred on the drafting paper; the tagline sits in its lower margin.
const square = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  ${paper(512, 512)}
  <text x="256" y="452" text-anchor="middle" font-family="${font}" font-size="30" font-weight="600" fill="${gold}">Del estudio a la obra</text>
</svg>`;
await sharp(Buffer.from(square))
  .composite([{ input: await mark(300), left: 106, top: 62 }])
  .flatten({ background: ground })
  .png({ compressionLevel: 9 })
  .toFile(path.join(root, "public", "og-square.png"));

console.log("Vistas previas generadas: public/og-image.png, public/og-square.png");
