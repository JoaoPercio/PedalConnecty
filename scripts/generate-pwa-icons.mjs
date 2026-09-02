/**
 * Generates PWA icon PNGs in public/icons/.
 * Run: node scripts/generate-pwa-icons.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#1B5E20"/>
  <circle cx="160" cy="300" r="72" fill="none" stroke="#FFFFFF" stroke-width="28"/>
  <circle cx="352" cy="300" r="72" fill="none" stroke="#FFFFFF" stroke-width="28"/>
  <path d="M160 300 L240 180 L300 180 L352 300" fill="none" stroke="#FFFFFF" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="300" cy="160" r="20" fill="#43A047"/>
</svg>
`;

const maskableSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#1B5E20"/>
  <circle cx="160" cy="320" r="64" fill="none" stroke="#FFFFFF" stroke-width="24"/>
  <circle cx="352" cy="320" r="64" fill="none" stroke="#FFFFFF" stroke-width="24"/>
  <path d="M160 320 L232 210 L288 210 L352 320" fill="none" stroke="#FFFFFF" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="288" cy="190" r="16" fill="#43A047"/>
</svg>
`;

async function writeIcon(name, size, sourceSvg) {
  const buf = await sharp(Buffer.from(sourceSvg)).resize(size, size).png().toBuffer();
  writeFileSync(join(outDir, name), buf);
  console.log(`Wrote ${name}`);
}

await writeIcon("icon-192.png", 192, svg);
await writeIcon("icon-512.png", 512, svg);
await writeIcon("icon-maskable-512.png", 512, maskableSvg);
