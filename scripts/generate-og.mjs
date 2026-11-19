import path from "node:path";
import sharp from "sharp";

/**
 * Link previews (WhatsApp, Telegram, social networks) from assets/logo.png:
 *   public/og-image.png  1200×630  logo, name and tagline on drafting paper
 *   public/og-square.png  512×512  compact thumbnail for chat apps
 */
const root = process.cwd();
const logo = path.join(root, "assets", "logo.png");
const ground = "#151920";
const gold = "#d4a359";
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

async function mark(size) {
  return sharp(logo).resize(size, size).png().toBuffer();
}

/**
 * The gold T alone, on transparency: alpha grows with each pixel's distance from the
 * logo's ground colour, so antialiased edges stay smooth over the drafting grid.
 */
async function goldT(size) {
  const { data, info } = await sharp(logo)
    .resize(size, size)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const [gr, gg, gb] = [0x15, 0x19, 0x20];
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
    const distance = Math.max(
      Math.abs(data[i] - gr),
      Math.abs(data[i + 1] - gg),
      Math.abs(data[i + 2] - gb),
    );
    out[j] = 0xd4;
    out[j + 1] = 0xa3;
    out[j + 2] = 0x59;
    out[j + 3] = Math.min(255, Math.max(0, (distance - 12) * 2.4));
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

// 1200 × 630: logo centred, wordmark and tagline below.
const wide = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  ${paper(1200, 630)}
  <text x="600" y="468" text-anchor="middle" font-family="${font}" font-size="68" font-weight="700" letter-spacing="10" fill="${ink}">TRAZO</text>
  <text x="600" y="522" text-anchor="middle" font-family="${font}" font-size="30" font-weight="500" fill="${gold}">Del estudio a la obra</text>
  <text x="600" y="582" text-anchor="middle" font-family="${font}" font-size="18" fill="${ink}" fill-opacity="0.55">Normativa RNE · calculadoras · metrados · honorarios</text>
</svg>`;
await sharp(Buffer.from(wide))
  .composite([{ input: await goldT(420), left: 390, top: 30 }])
  .png({ compressionLevel: 9 })
  .toFile(path.join(root, "public", "og-image.png"));

// 512 × 512: the logo fills the tile; the tagline sits in its lower margin.
const square = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <text x="256" y="462" text-anchor="middle" font-family="${font}" font-size="30" font-weight="600" fill="${gold}">Del estudio a la obra</text>
</svg>`;
await sharp(await mark(512))
  .composite([{ input: Buffer.from(square), left: 0, top: 0 }])
  .png({ compressionLevel: 9 })
  .toFile(path.join(root, "public", "og-square.png"));

console.log("Vistas previas generadas: public/og-image.png, public/og-square.png");
