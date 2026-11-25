import { generateQrPngBuffer } from "@/lib/qr";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Imagen PNG del QR de una entrada. Pública a propósito: la usan los correos. */
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const clean = code.replace(/\.png$/i, "");

  if (!UUID_RE.test(clean)) {
    return new Response("Código inválido", { status: 400 });
  }

  const png = await generateQrPngBuffer(clean.toLowerCase());

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      // El contenido depende solo del código: se puede cachear para siempre.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
