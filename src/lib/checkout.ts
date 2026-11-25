import type { SupabaseClient } from "@supabase/supabase-js";
import type { Ambassador, Database, DiscountCode, Event, TicketType } from "@/lib/database.types";
import {
  checkDiscountCode,
  DISCOUNT_REJECTION_MESSAGES,
  normalizeCode,
  type DiscountRule,
} from "@/lib/discount";
import { priceOrder, type PricedOrder } from "@/lib/pricing";

type Admin = SupabaseClient<Database>;

export interface CheckoutItemInput {
  ticketTypeId: string;
  quantity: number;
}

export class CheckoutError extends Error {
  constructor(
    message: string,
    public readonly status = 400
  ) {
    super(message);
  }
}

/** Máximo de entradas por orden (evita acaparar el cupo de un solo golpe). */
export const MAX_TICKETS_PER_ORDER = 20;

export interface Quote {
  event: Event;
  priced: PricedOrder;
  discount: DiscountCode | null;
  ambassadorId: string | null;
  ticketTypes: Map<string, TicketType>;
}

/** Mapea los errores de las RPC a mensajes para el comprador. */
export function friendlyRpcError(message: string, ticketTypes?: Map<string, TicketType>): CheckoutError | null {
  const sold = /SOLD_OUT:([0-9a-f-]{36})/i.exec(message);
  if (sold) {
    const name = ticketTypes?.get(sold[1])?.name;
    return new CheckoutError(
      name
        ? `Ya no quedan suficientes entradas de "${name}". Alguien más las acaba de reservar.`
        : "Ya no quedan suficientes entradas. Alguien más las acaba de reservar.",
      409
    );
  }
  if (message.includes("CODE_EXHAUSTED")) {
    return new CheckoutError("Este código de descuento ya alcanzó su límite de usos.", 409);
  }
  return null;
}

/**
 * Valida carrito + código + embajador y calcula el precio. No escribe nada.
 * `skipSalesWindow` es para cortesías, que el productor emite sin importar las fechas de venta.
 */
export async function buildQuote(
  admin: Admin,
  params: {
    eventId: string;
    items: CheckoutItemInput[];
    discountCode?: string | null;
    ambassadorCode?: string | null;
    requirePublished?: boolean;
    skipSalesWindow?: boolean;
  }
): Promise<Quote> {
  if (!params.eventId || params.items.length === 0) {
    throw new CheckoutError("Solicitud inválida");
  }

  const { data: event } = await admin.from("events").select("*").eq("id", params.eventId).maybeSingle<Event>();
  if (!event || (params.requirePublished !== false && event.status !== "published")) {
    throw new CheckoutError("Evento no disponible", 404);
  }

  const { data: types } = await admin
    .from("ticket_types")
    .select("*")
    .eq("event_id", params.eventId)
    .returns<TicketType[]>();
  const ticketTypes = new Map((types ?? []).map((t) => [t.id, t]));

  const merged = new Map<string, number>();
  for (const item of params.items) {
    const quantity = Number(item.quantity);
    if (!ticketTypes.has(item.ticketTypeId) || !Number.isInteger(quantity) || quantity <= 0) {
      throw new CheckoutError("Entrada inválida");
    }
    merged.set(item.ticketTypeId, (merged.get(item.ticketTypeId) ?? 0) + quantity);
  }

  const totalQty = [...merged.values()].reduce((a, b) => a + b, 0);
  if (totalQty > MAX_TICKETS_PER_ORDER) {
    throw new CheckoutError(`Puedes comprar hasta ${MAX_TICKETS_PER_ORDER} entradas por orden`);
  }

  const now = Date.now();
  const lines = [...merged.entries()].map(([ticketTypeId, quantity]) => {
    const tt = ticketTypes.get(ticketTypeId)!;
    if (!params.skipSalesWindow) {
      if (tt.sales_start && now < new Date(tt.sales_start).getTime()) {
        throw new CheckoutError(`La venta de "${tt.name}" aún no comienza`);
      }
      if (tt.sales_end && now > new Date(tt.sales_end).getTime()) {
        throw new CheckoutError(`La venta de "${tt.name}" ya finalizó`);
      }
    }
    if (quantity > tt.quantity - tt.sold_count - tt.reserved_count) {
      throw new CheckoutError(`No hay suficiente stock de "${tt.name}"`, 409);
    }
    return { ticketTypeId, basePrice: Number(tt.base_price), quantity };
  });

  let discount: DiscountCode | null = null;
  let rule: DiscountRule | null = null;
  const rawCode = params.discountCode ? normalizeCode(params.discountCode) : "";
  if (rawCode) {
    const { data } = await admin
      .from("discount_codes")
      .select("*")
      .eq("event_id", params.eventId)
      .eq("code", rawCode)
      .maybeSingle<DiscountCode>();

    if (!data) throw new CheckoutError("Ese código de descuento no existe");

    const verdict = checkDiscountCode(data, {
      eventId: params.eventId,
      now: new Date(),
      ticketTypeIds: lines.map((l) => l.ticketTypeId),
    });
    if (!verdict.ok) throw new CheckoutError(DISCOUNT_REJECTION_MESSAGES[verdict.reason]);

    discount = data;
    rule = { kind: data.kind, value: data.value, ticketTypeIds: data.ticket_type_ids };
  }

  let ambassadorId: string | null = null;
  const ref = params.ambassadorCode ? normalizeCode(params.ambassadorCode) : "";
  if (ref) {
    const { data } = await admin
      .from("ambassadors")
      .select("id, event_id, active")
      .eq("organizer_id", event.organizer_id)
      .eq("code", ref)
      .maybeSingle<Pick<Ambassador, "id" | "event_id" | "active">>();
    if (data?.active && (!data.event_id || data.event_id === event.id)) {
      ambassadorId = data.id;
    }
  }

  return { event, priced: priceOrder(lines, rule), discount, ambassadorId, ticketTypes };
}

/** Argumentos de `create_pending_order` a partir de una cotización. */
export function orderRpcArgs(
  quote: Quote,
  buyer: { id: string; email: string },
  kind: "sale" | "free" | "courtesy",
  extra: { ttlMinutes?: number; holderName?: string | null } = {}
) {
  const p = quote.priced;
  return {
    p_buyer_id: buyer.id,
    p_event_id: quote.event.id,
    p_buyer_email: buyer.email,
    p_items: p.lines.map((l) => ({
      ticket_type_id: l.ticketTypeId,
      quantity: l.quantity,
      unit_base_price: l.unitFinalPrice,
      unit_discount: l.unitDiscount,
    })),
    p_discount_code_id: quote.discount?.id ?? null,
    p_ambassador_id: quote.ambassadorId,
    p_amounts: {
      total: p.totalAmount,
      service_fee: p.serviceFeeAmount,
      mp_fee: p.mpFeeAmount,
      anc_fee: p.ancFeeAmount,
      discount: p.discountTotal,
    },
    p_kind: kind,
    p_ttl_minutes: extra.ttlMinutes ?? 20,
    p_holder_name: extra.holderName ?? null,
  };
}
