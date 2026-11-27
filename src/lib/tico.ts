/**
 * Tico, la mascota de ANC Tickets (el cubo ANC con carita). Poses recortadas del
 * reel oficial, en /public/tico (webp para la web, png para correos).
 */
export const TICO_POSES = {
  /** Quieto y sonriendo: la pose de reposo. */
  idle: { w: 287, h: 259 },
  /** Ojitos cerrados y brazos arriba: celebra. */
  celebra: { w: 413, h: 309 },
  /** Con lentes de sol: "todo bajo control". */
  lentes: { w: 323, h: 309 },
  /** Ojitos cerrados y pulgar arriba: aprobado. */
  pulgar: { w: 330, h: 321 },
  /** Saludando con una mano. */
  saluda: { w: 480, h: 446 },
  /** Brazos abiertos: bienvenida. */
  bienvenida: { w: 480, h: 339 },
} as const;

export type TicoPose = keyof typeof TICO_POSES;

export function ticoSrc(pose: TicoPose, format: "webp" | "png" = "webp"): string {
  return `/tico/${pose}.${format}`;
}

/** Alto proporcional a un ancho dado (para reservar el espacio y evitar saltos de layout). */
export function ticoHeight(pose: TicoPose, width: number): number {
  const { w, h } = TICO_POSES[pose];
  return Math.round((width * h) / w);
}
