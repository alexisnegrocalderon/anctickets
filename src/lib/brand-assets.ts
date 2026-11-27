import { readFile } from "node:fs/promises";
import path from "node:path";

let cachedMarkDataUri: string | null = null;

/** Isotipo de ANC embebido como data URI — sin depender de fetch de red externa. */
export async function getMarkDataUri(): Promise<string> {
  if (cachedMarkDataUri) return cachedMarkDataUri;

  const filePath = path.join(process.cwd(), "src/app/icon.png");
  const buffer = await readFile(filePath);
  cachedMarkDataUri = `data:image/png;base64,${buffer.toString("base64")}`;
  return cachedMarkDataUri;
}

let cachedPosterFont: ArrayBuffer | null = null;

/** Anton (tipografía de los afiches) para las imágenes al compartir. Licencia OFL. */
export async function getPosterFont(): Promise<ArrayBuffer> {
  if (cachedPosterFont) return cachedPosterFont;
  const buffer = await readFile(path.join(process.cwd(), "src/assets/fonts/Anton-Regular.ttf"));
  cachedPosterFont = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  return cachedPosterFont;
}

/**
 * Descarga la imagen de un evento y la devuelve como data URI jpeg de 1200 px
 * (el generador de imágenes no entiende webp/avif). Devuelve null si algo
 * falla o tarda: el afiche usa entonces los colores del tema del evento.
 */
export async function fetchPosterDataUri(url: string | null | undefined): Promise<string | null> {
  if (!url || !/^https:\/\//i.test(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const input = Buffer.from(await res.arrayBuffer());
    if (input.length > 12 * 1024 * 1024) return null;
    const { default: sharp } = await import("sharp");
    const jpeg = await sharp(input).rotate().resize({ width: 1200, height: 630, fit: "cover" }).jpeg({ quality: 80 }).toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
}

let cachedTicoDataUri: string | null = null;

/** Tico (🐯, Noto Emoji, licencia Apache 2.0) embebido para las imágenes al compartir. */
export async function getTicoDataUri(): Promise<string> {
  if (cachedTicoDataUri) return cachedTicoDataUri;
  const buffer = await readFile(path.join(process.cwd(), "src/assets/tico.png"));
  cachedTicoDataUri = `data:image/png;base64,${buffer.toString("base64")}`;
  return cachedTicoDataUri;
}
