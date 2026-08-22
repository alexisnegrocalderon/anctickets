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
