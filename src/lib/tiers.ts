/**
 * Tandas de entradas. Cada tanda es un `ticket_types` con su propia ventana de
 * venta (sales_start / sales_end, opcionales, hora de Chile) y una pausa manual.
 * Todo es lógica pura: el servidor, el panel y la página pública usan lo mismo.
 */
import { chileLocalToIso, isoToChileInput } from "@/lib/datetime";

const TZ = "America/Santiago";

export type TierStatus = "on_sale" | "upcoming" | "ended" | "sold_out" | "paused";

export interface TierLike {
  quantity: number;
  sold_count: number;
  reserved_count: number;
  sales_start: string | null;
  sales_end: string | null;
  paused?: boolean | null;
}

type Instant = number | Date;
const ms = (t: Instant) => (typeof t === "number" ? t : t.getTime());

/**
 * Estado de una tanda en el instante `now`. Orden de prioridad (el primero que
 * se cumple gana):
 *   1. paused    : el productor pausó la venta, sin importar nada más.
 *   2. sold_out  : sold_count + reserved_count >= quantity (cupo 0 cuenta como agotada).
 *   3. upcoming  : sales_start > now (la apertura es inclusiva: en start exacto ya está en venta).
 *   4. ended     : sales_end <= now (el cierre es exacto: a partir de ese instante ya no se vende).
 *   5. on_sale   : en cualquier otro caso.
 * Una fecha inválida se ignora (como si estuviera vacía).
 */
export function tierStatus(tier: TierLike, now: Instant): TierStatus {
  const t = ms(now);
  if (tier.paused) return "paused";
  if (tier.sold_count + tier.reserved_count >= tier.quantity) return "sold_out";
  const start = tier.sales_start ? new Date(tier.sales_start).getTime() : NaN;
  const end = tier.sales_end ? new Date(tier.sales_end).getTime() : NaN;
  if (!Number.isNaN(start) && start > t) return "upcoming";
  if (!Number.isNaN(end) && end <= t) return "ended";
  return "on_sale";
}

export function remainingTickets(tier: Pick<TierLike, "quantity" | "sold_count" | "reserved_count">): number {
  return Math.max(tier.quantity - tier.sold_count - tier.reserved_count, 0);
}

/** "Últimas N": quedan entre 1 y 10, o quedan 15% del cupo o menos. */
export function isLastTickets(tier: Pick<TierLike, "quantity" | "sold_count" | "reserved_count">): boolean {
  const left = remainingTickets(tier);
  if (left <= 0 || tier.quantity <= 0) return false;
  return left <= 10 || left <= tier.quantity * 0.15;
}

/** "2 d 4 h", "5 h 12 min", "12 min 40 s" (minutos y segundos solo en la última hora). */
export function formatCountdown(msLeft: number): string {
  const total = Math.max(Math.floor(msLeft / 1000), 0);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d} d ${h} h`;
  if (h > 0) return `${h} h ${m} min`;
  if (m > 0) return `${m} min ${s} s`;
  return `${s} s`;
}

function chileParts(ts: number) {
  const parts = new Intl.DateTimeFormat("es-CL", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(ts));
  const get = (type: string) => (parts.find((p) => p.type === type)?.value ?? "").replace(/\./g, "");
  return { weekday: get("weekday"), day: get("day"), month: get("month"), hour: get("hour"), minute: get("minute") };
}

/** "sáb 14 dic, 22:00" en hora de Chile. Vacío si la fecha no es válida. */
export function formatChileDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "";
  const p = chileParts(ts);
  return `${p.weekday} ${p.day} ${p.month}, ${p.hour}:${p.minute}`;
}

/** "sáb 14 dic a las 23:59": para frases como "Cierra el …". */
export function formatChileWhen(iso: string | null | undefined): string {
  const text = formatChileDate(iso);
  return text ? text.replace(", ", " a las ") : "";
}

export interface TierDatesResult {
  startIso: string | null;
  endIso: string | null;
  error?: string;
  warning?: string;
}

/**
 * Valida "Abre" y "Cierra" (datetime-local, hora de Chile). Error: formato
 * inválido o cierre no posterior a la apertura. Advertencia (no bloquea): el
 * cierre es posterior al inicio del evento.
 */
export function validateTierDates(
  startLocal: string | null | undefined,
  endLocal: string | null | undefined,
  eventDateIso?: string | null
): TierDatesResult {
  const startRaw = (startLocal ?? "").trim();
  const endRaw = (endLocal ?? "").trim();
  const startIso = startRaw ? chileLocalToIso(startRaw) : null;
  const endIso = endRaw ? chileLocalToIso(endRaw) : null;
  const base = { startIso, endIso };

  if (startRaw && !startIso) return { ...base, error: "La fecha de apertura no es válida." };
  if (endRaw && !endIso) return { ...base, error: "La fecha de cierre no es válida." };
  if (startIso && endIso && new Date(endIso).getTime() <= new Date(startIso).getTime()) {
    return { ...base, error: "El cierre debe ser posterior a la apertura." };
  }
  if (endIso && eventDateIso) {
    const eventTs = new Date(eventDateIso).getTime();
    if (!Number.isNaN(eventTs) && new Date(endIso).getTime() > eventTs) {
      return { ...base, warning: "El cierre es posterior al inicio del evento." };
    }
  }
  return base;
}

/** Orden de la lista: por apertura (sin fecha = desde ya, va primero) y luego por creación. */
export function sortTiers<T extends { sales_start: string | null; created_at?: string | null }>(tiers: T[]): T[] {
  const key = (t: T) => (t.sales_start ? new Date(t.sales_start).getTime() : -Infinity);
  const created = (t: T) => (t.created_at ? new Date(t.created_at).getTime() : 0);
  return [...tiers].sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    if (ka !== kb) return ka < kb ? -1 : 1;
    return created(a) - created(b);
  });
}

export const TIER_STATUS_LABEL: Record<TierStatus, string> = {
  on_sale: "En venta",
  upcoming: "Próximamente",
  ended: "Venta cerrada",
  sold_out: "Agotada",
  paused: "Pausada",
};

/** Resumen de fechas de una tanda, siempre con fecha y hora. */
export function tierDatesSummary(tier: Pick<TierLike, "sales_start" | "sales_end">): string {
  const a = formatChileDate(tier.sales_start);
  const b = formatChileDate(tier.sales_end);
  if (a && b) return `Del ${a} al ${b}`;
  if (a) return `Desde el ${a}`;
  if (b) return `Hasta el ${b}`;
  return "Sin fechas: se vende desde ya";
}

/** Valor para un datetime-local: ahora, en hora de Chile. */
export function nowChileInput(now: Instant = Date.now()): string {
  return isoToChileInput(new Date(ms(now)).toISOString());
}

/** "Hoy a las 23:59" (hora de Chile) como valor de datetime-local. */
export function todayEndChileInput(now: Instant = Date.now()): string {
  return `${nowChileInput(now).slice(0, 10)}T23:59`;
}

/**
 * Reloj del servidor para pasar como `serverNow` a las páginas. Va en una
 * función aparte porque las páginas del servidor se ejecutan una vez por
 * petición (no se re-renderizan como un componente de cliente).
 */
export function serverClock(): number {
  return Date.now();
}
