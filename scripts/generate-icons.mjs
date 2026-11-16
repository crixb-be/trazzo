import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const source = path.join(root, "public", "icons", "icon.svg");
const outputDirectory = path.join(root, "public", "icons");

await mkdir(outputDirectory, { recursive: true });

const outputs = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "icon-192-maskable.png", size: 192 },
  { name: "icon-512-maskable.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

for (const output of outputs) {
  await sharp(source)
    .resize(output.size, output.size, { fit: "contain" })
    .png()
    .toFile(path.join(outputDirectory, output.name));
}

console.log("Iconos generados:", outputs.map((output) => output.name).join(", "));
