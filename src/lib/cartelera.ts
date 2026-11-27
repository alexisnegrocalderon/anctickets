/**
 * Cartelera (/eventos): lógica pura para etiquetas de tandas, filtros por
 * fecha, calendario y la frase de Tico. Todo sale de datos reales de la base
 * (tandas y fecha del evento); nada se inventa. Hora de Chile.
 */
import { remainingTickets, tierStatus, type TierLike } from "@/lib/tiers";

const TZ = "America/Santiago";
const HOUR = 3600_000;
const DAY = 24 * HOUR;

export type CarteleraTier = TierLike & { base_price: number };

export type BadgeTone = "hot" | "info" | "muted";
export type Badge = { text: string; tone: BadgeTone };

/** Fecha calendario de Chile ("2026-11-27") de un instante. */
export function chileDay(ts: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(ts),
  );
}

/** Hora (0-23) de Chile de un instante. */
function chileHour(ts: number): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" }).format(new Date(ts)),
  );
}

/** Días calendario de Chile entre dos instantes (0 = mismo día). */
export function chileDaysBetween(from: number, to: number): number {
  const a = Date.parse(`${chileDay(from)}T00:00:00Z`);
  const b = Date.parse(`${chileDay(to)}T00:00:00Z`);
  return Math.round((b - a) / DAY);
}

function whenWord(now: number, at: number): string {
  const days = chileDaysBetween(now, at);
  if (days <= 0) return "hoy";
  if (days === 1) return "mañana";
  return `en ${days} días`;
}

/**
 * Hasta 2 etiquetas por evento, por prioridad:
 *  - Agotado: todas las tandas agotadas.
 *  - Próximamente: ninguna en venta y alguna por abrir.
 *  - Con una tanda en venta:
 *      "Quedan N entradas" si quedan pocas (≤10 o ≤15% del cupo),
 *      "Preventa" si después viene una tanda más cara,
 *      "Sube hoy/mañana/en N días" si esa tanda más cara abre en ≤7 días,
 *      "Última tanda" si es la última por abrir y hubo otras antes.
 */
export function eventBadges(tiers: CarteleraTier[], now: number): Badge[] {
  if (tiers.length === 0) return [];
  const withStatus = tiers.map((t) => ({ t, s: tierStatus(t, now) }));

  if (withStatus.every(({ s }) => s === "sold_out")) return [{ text: "Agotado", tone: "muted" }];

  const onSale = withStatus.filter(({ s }) => s === "on_sale").map(({ t }) => t);
  const upcoming = withStatus.filter(({ s }) => s === "upcoming").map(({ t }) => t);

  if (onSale.length === 0) {
    return upcoming.length > 0 ? [{ text: "Próximamente", tone: "info" }] : [];
  }

  // La tanda "vigente": la más barata en venta (la que la gente compra primero).
  const current = [...onSale].sort((a, b) => a.base_price - b.base_price)[0];
  const badges: Badge[] = [];

  const left = remainingTickets(current);
  const fewLeft = left > 0 && (left <= 10 || left <= current.quantity * 0.15);

  const pricier = upcoming
    .filter((t) => t.base_price > current.base_price && t.sales_start)
    .sort((a, b) => Date.parse(a.sales_start!) - Date.parse(b.sales_start!))[0];

  if (pricier) {
    const at = Date.parse(pricier.sales_start!);
    const soon = !Number.isNaN(at) && at - now <= 7 * DAY;
    badges.push({ text: soon ? `Preventa · sube ${whenWord(now, at)}` : "Preventa", tone: "hot" });
  } else if (upcoming.length === 0 && tiers.length > 1) {
    badges.push({ text: "Última tanda", tone: "hot" });
  }

  if (fewLeft) badges.push({ text: left === 1 ? "Queda 1 entrada" : `Quedan ${left} entradas`, tone: "hot" });

  return badges.slice(0, 2);
}

export type CarteleraFilter = "todo" | "noche" | "semana" | "mes";

export const FILTER_LABEL: Record<CarteleraFilter, string> = {
  todo: "Todo",
  noche: "Esta noche",
  semana: "Esta semana",
  mes: "Este mes",
};

/**
 * ¿El evento entra en el filtro?
 *  - noche: desde ahora hasta las 6:00 de mañana (hora de Chile); entre las
 *    00:00 y las 6:00, la "noche" es la que está corriendo.
 *  - semana: los próximos 7 días calendario (hoy incluido).
 *  - mes: los próximos 30 días calendario.
 */
export function matchesFilter(eventIso: string, filter: CarteleraFilter, now: number): boolean {
  const at = Date.parse(eventIso);
  if (Number.isNaN(at)) return false;
  if (filter === "todo") return true;
  const days = chileDaysBetween(now, at);
  if (filter === "noche") {
    const lateNight = chileHour(now) < 6;
    if (lateNight) return days === 0 && chileHour(at) < 6;
    return days === 0 || (days === 1 && chileHour(at) < 6);
  }
  if (filter === "semana") return days >= 0 && days < 7;
  return days >= 0 && days < 30;
}

/** Los próximos `count` días (Chile) con la marca de si hay evento ese día. */
export function calendarDays(eventIsos: string[], now: number, count = 21): { day: string; hasEvent: boolean }[] {
  const withEvents = new Set(eventIsos.map((iso) => chileDay(Date.parse(iso))));
  const base = Date.parse(`${chileDay(now)}T12:00:00Z`);
  return Array.from({ length: count }, (_, i) => {
    const day = chileDay(base + i * DAY);
    return { day, hasEvent: withEvents.has(day) };
  });
}

/** Frase de Tico según los datos reales del evento. */
export function ticoLine(eventIso: string, tiers: CarteleraTier[], now: number): string {
  const badges = eventBadges(tiers, now);
  const at = Date.parse(eventIso);
  const days = Number.isNaN(at) ? 99 : chileDaysBetween(now, at);
  if (badges.some((b) => b.text === "Agotado")) return "Se agotó. Atento a la próxima fecha.";
  if (badges.some((b) => b.text.startsWith("Queda"))) return "¡Quedan pocas! Yo no lo pensaría mucho.";
  if (days === 0) return "¡Es hoy! Prepara la mejor pinta.";
  if (days === 1) return "Mañana se arma. ¿Ya tienes tu entrada?";
  if (badges.some((b) => b.text.startsWith("Preventa · sube"))) return "La preventa se acaba pronto. Aprovecha el precio.";
  if (badges.some((b) => b.text === "Próximamente")) return "Todavía no abren las entradas. Guárdalo.";
  if (badges.some((b) => b.text === "Última tanda")) return "Es la última tanda. Después, nada.";
  if (days <= 7) return "Es esta semana. Avísale a tu gente.";
  return "Anótalo en el calendario, este viene bueno.";
}

/** Reacciones permitidas: la clave va a la base (CHECK); el carácter solo se muestra. */
export const REACTIONS = [
  { key: "fuego", emoji: "🔥", label: "Fuego" },
  { key: "manos", emoji: "🙌", label: "Aplausos" },
  { key: "amor", emoji: "😍", label: "Me encanta" },
  { key: "fiesta", emoji: "🎉", label: "Fiesta" },
] as const;

export type ReactionKey = (typeof REACTIONS)[number]["key"];

export function isReactionKey(value: unknown): value is ReactionKey {
  return typeof value === "string" && REACTIONS.some((r) => r.key === value);
}

/** Bajo 10 reacciones solo se ve el emoji, sin número. */
export function reactionCountLabel(count: number): string | null {
  if (count < 10) return null;
  if (count < 1000) return String(count);
  return `${(count / 1000).toFixed(count < 10_000 ? 1 : 0).replace(".0", "").replace(".", ",")} mil`;
}
