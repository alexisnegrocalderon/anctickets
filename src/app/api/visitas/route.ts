import { NextResponse } from "next/server";
import { isClientMetric } from "@/lib/entry-metrics";
import { bumpEntryMetric } from "@/lib/entry-metrics-server";

/**
 * Contadores de las puertas. Recibe solo una clave de una lista cerrada y suma
 * 1 al total del día. No guarda IP, correo ni usuario. Siempre responde 204
 * para no dar pistas ni afectar la navegación.
 */
export async function POST(request: Request) {
  let metric: unknown = null;
  try {
    const body = (await request.json()) as { m?: unknown };
    metric = body?.m;
  } catch {
    // Cuerpo inválido: se ignora.
  }
  if (isClientMetric(metric)) await bumpEntryMetric(metric);
  return new NextResponse(null, { status: 204 });
}
