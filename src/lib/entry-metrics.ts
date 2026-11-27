/** Claves de los contadores de las puertas (migración 0014). Deben calzar con el CHECK de la tabla. */
export const ENTRY_METRICS = [
  "puertas_vista",
  "puerta_eventos",
  "puerta_productor",
  "productor_crear",
  "productor_ver_como",
  "encabezado_crear",
  "alta_productora",
] as const;

export type EntryMetric = (typeof ENTRY_METRICS)[number];

/** Las que puede enviar el navegador (el alta la cuenta solo el servidor). */
export const CLIENT_METRICS: ReadonlySet<string> = new Set<EntryMetric>(
  ENTRY_METRICS.filter((m) => m !== "alta_productora"),
);

export function isClientMetric(value: unknown): value is EntryMetric {
  return typeof value === "string" && CLIENT_METRICS.has(value);
}
