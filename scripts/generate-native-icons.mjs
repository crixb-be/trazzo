import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { readdir, rename } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { BRAND_GROUND } from "./brand.mjs";

/**
 * Native icons and splash screens from assets/logo.png (transparent) on BRAND_GROUND.
 *
 * `@capacitor/assets` already lays the logo on the background colour for the iOS icon,
 * the Android adaptive icon and every splash, but copies the transparent logo as-is into
 * the legacy Android launcher icons (Android 7.1 and older). This wrapper runs it, then
 * places those legacy icons on the brand ground too. Extra arguments (`--android`,
 * `--ios`) are forwarded: `npm run icons:native -- --android`.
 */
const root = process.cwd();
const ground = BRAND_GROUND.toUpperCase();
// The CLI runs on this same Node binary: no npx, no shell, arguments passed verbatim.
const cli = path.join(
  path.dirname(createRequire(import.meta.url).resolve("@capacitor/assets/package.json")),
  "bin",
  "capacitor-assets",
);
const args = [
  cli,
  "generate",
  "--assetPath",
  "assets",
  "--iconBackgroundColor",
  ground,
  "--iconBackgroundColorDark",
  ground,
  "--splashBackgroundColor",
  ground,
  "--splashBackgroundColorDark",
  ground,
  ...process.argv.slice(2),
];

const run = spawnSync(process.execPath, args, { stdio: "inherit" });
if (run.status !== 0) process.exit(run.status ?? 1);

const skipAndroid = process.argv.includes("--ios") && !process.argv.includes("--android");
const res = path.join(root, "android", "app", "src", "main", "res");
const directories = skipAndroid ? [] : await readdir(res).catch(() => []);

let flattened = 0;
for (const directory of directories.filter((name) => name.startsWith("mipmap-"))) {
  for (const [name, round] of [
    ["ic_launcher.png", false],
    ["ic_launcher_round.png", true],
  ]) {
    const file = path.join(res, directory, name);
    const meta = await sharp(file)
      .metadata()
      .catch(() => null);
    if (!meta?.width || !meta.height) continue;
    const { width, height } = meta;
    // Same footprint as the generated icon: a full circle for the round one, a square
    // with softened corners inside the tool's 8 px margin for the classic one.
    const inset = round ? 0 : Math.min(8, Math.floor(width / 12));
    const shape = round
      ? `<circle cx="${width / 2}" cy="${height / 2}" r="${width / 2}" fill="${BRAND_GROUND}"/>`
      : `<rect x="${inset}" y="${inset}" width="${width - inset * 2}" height="${height - inset * 2}" rx="${Math.round(width * 0.12)}" fill="${BRAND_GROUND}"/>`;
    const svg = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${shape}</svg>`,
    );
    const output = await sharp(svg)
      .composite([{ input: file }])
      .png({ compressionLevel: 9 })
      .toBuffer();
    await sharp(output).toFile(file + ".tmp");
    await rename(file + ".tmp", file);
    flattened++;
  }
}

if (flattened) console.log(`Íconos legacy de Android sobre ${BRAND_GROUND}: ${flattened}`);
