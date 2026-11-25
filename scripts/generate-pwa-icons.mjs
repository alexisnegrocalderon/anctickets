// Genera los íconos de la PWA desde el isotipo (public/anc-mark.png).
// Uso: node scripts/generate-pwa-icons.mjs
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(root, "public/anc-mark.png");
const OUT = path.join(root, "public/icons");
const BG = "#1d1d1d";

// Recorta el margen transparente para controlar el tamaño del isotipo.
const mark = await sharp(SRC).trim().toBuffer();

async function icon(size, fill, file) {
  const inner = Math.round(size * fill);
  const resized = await sharp(mark).resize(inner, inner, { fit: "inside" }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: resized, gravity: "center" }])
    .flatten({ background: BG })
    .png()
    .toFile(path.join(OUT, file));
  console.log("ok", file);
}

await icon(192, 0.7, "icon-192.png");
await icon(512, 0.7, "icon-512.png");
// Maskable: el isotipo dentro del 60% central (zona segura del 80% circular).
await icon(512, 0.58, "icon-maskable-512.png");
await icon(180, 0.7, "apple-touch-icon.png");
