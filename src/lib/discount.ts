/**
 * Reglas de descuento. Un solo lugar para la regla, usado por el checkout del
 * servidor, la vista previa del formulario de compra y los tests, así lo que
 * se muestra es lo mismo que se cobra.
 *
 *  - `percent`: porcentaje sobre el precio base de CADA entrada elegible,
 *    redondeado hacia abajo al peso (el descuento nunca regala un peso de más).
 *  - `fixed`: monto en CLP descontado de CADA entrada elegible.
 *  - Nunca deja una entrada bajo $0.
 *  - `ticketTypeIds` null/vacío = aplica a todos los tipos del evento.
 */

export type DiscountKind = "percent" | "fixed";

export interface DiscountRule {
  kind: DiscountKind;
  value: number;
  ticketTypeIds?: string[] | null;
}

export interface DiscountableLine {
  ticketTypeId: string;
  basePrice: number;
  quantity: number;
}

export interface DiscountedLine extends DiscountableLine {
  unitDiscount: number;
  unitFinalPrice: number;
}

export function isEligible(rule: DiscountRule, ticketTypeId: string): boolean {
  return !rule.ticketTypeIds || rule.ticketTypeIds.length === 0 || rule.ticketTypeIds.includes(ticketTypeId);
}

export function unitDiscount(basePrice: number, rule: DiscountRule): number {
  if (!(basePrice > 0) || !(rule.value > 0)) return 0;
  const raw = rule.kind === "percent" ? Math.floor((basePrice * Math.min(rule.value, 100)) / 100) : Math.floor(rule.value);
  return Math.min(Math.max(raw, 0), basePrice);
}

export function applyDiscount(lines: DiscountableLine[], rule: DiscountRule | null): {
  lines: DiscountedLine[];
  discountTotal: number;
} {
  let discountTotal = 0;
  const out = lines.map((line) => {
    const d = rule && isEligible(rule, line.ticketTypeId) ? unitDiscount(line.basePrice, rule) : 0;
    discountTotal += d * line.quantity;
    return { ...line, unitDiscount: d, unitFinalPrice: line.basePrice - d };
  });
  return { lines: out, discountTotal };
}

export interface DiscountCodeRow {
  event_id: string;
  kind: DiscountKind;
  value: number;
  max_uses: number | null;
  used_count: number;
  valid_from: string | null;
  valid_until: string | null;
  ticket_type_ids: string[] | null;
  active: boolean;
}

export type DiscountRejection =
  | "inactive"
  | "wrong_event"
  | "not_started"
  | "expired"
  | "exhausted"
  | "not_applicable";

export const DISCOUNT_REJECTION_MESSAGES: Record<DiscountRejection, string> = {
  inactive: "Este código no está activo",
  wrong_event: "Este código no es válido para este evento",
  not_started: "Este código todavía no está vigente",
  expired: "Este código ya venció",
  exhausted: "Este código ya alcanzó su límite de usos",
  not_applicable: "Este código no aplica a las entradas que elegiste",
};

/** Valida un código contra el evento, las fechas, los usos y las entradas elegidas. */
export function checkDiscountCode(
  row: DiscountCodeRow,
  ctx: { eventId: string; now: Date; ticketTypeIds: string[] }
): { ok: true } | { ok: false; reason: DiscountRejection } {
  if (row.event_id !== ctx.eventId) return { ok: false, reason: "wrong_event" };
  if (!row.active) return { ok: false, reason: "inactive" };
  if (row.valid_from && ctx.now.getTime() < new Date(row.valid_from).getTime()) {
    return { ok: false, reason: "not_started" };
  }
  if (row.valid_until && ctx.now.getTime() > new Date(row.valid_until).getTime()) {
    return { ok: false, reason: "expired" };
  }
  if (row.max_uses !== null && row.used_count >= row.max_uses) {
    return { ok: false, reason: "exhausted" };
  }
  const scope = row.ticket_type_ids;
  if (scope && scope.length > 0 && !ctx.ticketTypeIds.some((id) => scope.includes(id))) {
    return { ok: false, reason: "not_applicable" };
  }
  return { ok: true };
}

/** Normaliza un código tal como se guarda (mayúsculas, sin espacios). */
export function normalizeCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}
