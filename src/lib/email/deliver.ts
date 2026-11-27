/**
 * Lógica de servidor de los correos: carga de datos tolerante a que la
 * migración 0011 no esté aplicada, aviso de venta a la productora, resumen
 * diario y avisos de cambio/cancelación. Todo usa el cliente de servicio.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Event } from "@/lib/database.types";
import { chileLocalToIso } from "@/lib/datetime";
import { siteUrl } from "@/lib/site";
import {
  renderEventNoticeEmail,
  renderProducerSaleEmail,
  renderProducerSummaryEmail,
  sanitizeNoticeMessage,
  hasLink,
} from "./notices";
import { MAX_NOTICE_RECIPIENTS, sendAncEmail, sendBatchIndividually } from "./send";
import { maskEmail, validateContactEmail, EMAIL_LIMITS } from "./sanitize";
import type { EmailEventData, EmailTicketData } from "./template";

type Admin = SupabaseClient<Database>;

/** Campos de marca del evento tal como los lee el correo (tolera columnas ausentes). */
export function eventToEmailData(event: Event): EmailEventData {
  return {
    title: event.title,
    venue: event.venue,
    eventDate: event.event_date,
    imageUrl: event.image_url,
    theme: event.theme,
    accentColor: event.accent_color,
    organizerLogoUrl: event.organizer_logo_url,
    welcome: event.email_welcome ?? null,
    access: event.email_access ?? null,
    rules: event.email_rules ?? null,
    directions: event.email_directions ?? null,
    contactEmail: event.contact_email ?? null,
    contactInstagram: event.contact_instagram ?? null,
    contactWhatsapp: event.contact_whatsapp ?? null,
    useEventImage: event.email_use_event_image ?? true,
  };
}

/** Nombre de la productora; si falla la lectura devuelve null (el correo sigue). */
export async function readProducerName(admin: Admin, organizerId: string): Promise<string | null> {
  try {
    const { data } = await admin.from("profiles").select("organizer_name").eq("id", organizerId).maybeSingle();
    return (data as { organizer_name: string | null } | null)?.organizer_name ?? null;
  } catch {
    return null;
  }
}

/** Notas por tipo de entrada (email_note). Si la columna no existe o falla, devuelve {} y el correo sale sin notas. */
export async function readTicketNotes(admin: Admin, ticketTypeIds: string[]): Promise<Record<string, string>> {
  if (ticketTypeIds.length === 0) return {};
  try {
    const { data, error } = await admin.from("ticket_types").select("id, email_note").in("id", ticketTypeIds);
    if (error || !data) return {};
    const out: Record<string, string> = {};
    for (const row of data as { id: string; email_note: string | null }[]) {
      if (row.email_note) out[row.id] = row.email_note;
    }
    return out;
  } catch {
    return {};
  }
}

export type TicketRowForEmail = {
  qr_code: string;
  holder_name: string | null;
  ticket_type_id: string;
  ticket_types: { name: string } | null;
};

export function toEmailTickets(rows: TicketRowForEmail[], notes: Record<string, string>): EmailTicketData[] {
  return rows.map((t) => ({
    typeName: t.ticket_types?.name ?? "Entrada",
    qrCode: t.qr_code,
    holderName: t.holder_name,
    note: notes[t.ticket_type_id] ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Aviso de venta a la productora
// ---------------------------------------------------------------------------

/**
 * Avisa a la productora de una venta aprobada (kind 'sale' o 'free'; nunca
 * cortesías) si eligió "cada venta". Reclama `producer_notified_at` de forma
 * atómica para no duplicar. NUNCA lanza ni afecta al comprador: todo va en
 * try/catch y solo deja un log.
 */
export async function notifyProducerOfSale(admin: Admin, orderId: string): Promise<boolean> {
  let claimed = false;
  try {
    const { data: order } = await admin
      .from("orders")
      .select("id, event_id, kind, status, holder_name, buyer_id, producer_notified_at")
      .eq("id", orderId)
      .maybeSingle();
    if (!order || order.status !== "approved" || (order.kind !== "sale" && order.kind !== "free")) return false;
    if (order.producer_notified_at) return false;

    const { data: event } = await admin
      .from("events")
      .select("id, title, organizer_id")
      .eq("id", order.event_id)
      .maybeSingle();
    if (!event) return false;

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("email, notify_sales")
      .eq("id", event.organizer_id)
      .maybeSingle();
    // Columna ausente (migración sin aplicar) o sin preferencia: no se avisa.
    if (profileError || !profile) return false;
    const mode = (profile as { notify_sales?: string }).notify_sales ?? "each";
    const to = validateContactEmail((profile as { email: string | null }).email ?? "");
    if (mode !== "each" || !to) return false;

    // Reclamo atómico.
    const { data: won, error: claimError } = await admin
      .from("orders")
      .update({ producer_notified_at: new Date().toISOString() })
      .eq("id", orderId)
      .is("producer_notified_at", null)
      .select("id");
    if (claimError || !won || won.length === 0) return false;
    claimed = true;

    const { data: items } = await admin
      .from("order_items")
      .select("quantity, unit_base_price, ticket_types(name)")
      .eq("order_id", orderId)
      .returns<{ quantity: number; unit_base_price: number; ticket_types: { name: string } | null }[]>();
    const lines = (items ?? []).map((i) => ({ name: i.ticket_types?.name ?? "Entrada", quantity: i.quantity }));
    if (lines.length === 0) throw new Error("La orden no tiene ítems");
    const amount = (items ?? []).reduce((s, i) => s + Number(i.unit_base_price) * i.quantity, 0);

    const { data: types } = await admin.from("ticket_types").select("sold_count, quantity").eq("event_id", order.event_id);
    const sold = (types ?? []).reduce((s, t) => s + t.sold_count, 0);
    const total = (types ?? []).reduce((s, t) => s + t.quantity, 0);

    let buyerName: string | null = order.holder_name;
    if (!buyerName && order.buyer_id) {
      const { data: buyer } = await admin.from("profiles").select("full_name").eq("id", order.buyer_id).maybeSingle();
      buyerName = (buyer as { full_name: string | null } | null)?.full_name ?? null;
    }

    await sendAncEmail(
      to,
      renderProducerSaleEmail({
        siteUrl: siteUrl(),
        eventId: event.id,
        eventTitle: event.title,
        kind: order.kind,
        lines,
        amount,
        sold,
        total,
        buyerName,
      })
    );
    return true;
  } catch (err) {
    if (claimed) {
      try {
        await admin.from("orders").update({ producer_notified_at: null }).eq("id", orderId);
      } catch {
        /* se registra abajo */
      }
    }
    console.error(`No se pudo avisar de la venta de la orden ${orderId}:`, err instanceof Error ? err.message : "error");
    return false;
  }
}

// ---------------------------------------------------------------------------
// Resumen diario
// ---------------------------------------------------------------------------

const CHILE_TZ = "America/Santiago";

/** Fecha "YYYY-MM-DD" en hora de Chile de un instante. */
export function chileDateString(at: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: CHILE_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

/** Día anterior (Chile) y su ventana [desde, hasta) en ISO UTC. */
export function previousChileDayWindow(now: Date): { day: string; from: string; to: string } {
  const today = chileDateString(now);
  const [y, m, d] = today.split("-").map(Number);
  const prev = new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
  return {
    day: prev,
    from: chileLocalToIso(`${prev}T00:00`)!,
    to: chileLocalToIso(`${today}T00:00`)!,
  };
}

function dayLabel(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}

/**
 * Envía el resumen de ayer (hora de Chile) a las productoras que eligieron
 * "resumen diario" y tuvieron ventas. Idempotente: `profiles.sales_summary_on`
 * se actualiza de forma atómica antes de enviar; si el envío falla se revierte.
 */
export async function sendDailySummaries(admin: Admin, now = new Date()): Promise<{ sent: number; skipped: number; failed: number }> {
  const result = { sent: 0, skipped: 0, failed: 0 };
  const win = previousChileDayWindow(now);

  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, email, sales_summary_on")
    .eq("notify_sales", "daily");
  if (error || !profiles) return result; // columna ausente o error: no rompe el cron

  for (const profile of profiles as { id: string; email: string | null; sales_summary_on: string | null }[]) {
    let claimed = false;
    try {
      if (profile.sales_summary_on && profile.sales_summary_on >= win.day) {
        result.skipped++;
        continue;
      }
      const to = validateContactEmail(profile.email ?? "");
      if (!to) {
        result.skipped++;
        continue;
      }

      const { data: events } = await admin.from("events").select("id, title").eq("organizer_id", profile.id);
      if (!events || events.length === 0) {
        result.skipped++;
        continue;
      }

      const { data: orders } = await admin
        .from("orders")
        .select("event_id, order_items(quantity, unit_base_price)")
        .in("event_id", events.map((e) => e.id))
        .eq("status", "approved")
        .in("kind", ["sale", "free"])
        .gte("tickets_issued_at", win.from)
        .lt("tickets_issued_at", win.to)
        .returns<{ event_id: string; order_items: { quantity: number; unit_base_price: number }[] }[]>();
      if (!orders || orders.length === 0) {
        result.skipped++;
        continue;
      }

      // Reclamo atómico del día.
      let claim = admin.from("profiles").update({ sales_summary_on: win.day }).eq("id", profile.id);
      claim = profile.sales_summary_on
        ? claim.eq("sales_summary_on", profile.sales_summary_on)
        : claim.is("sales_summary_on", null);
      const { data: won } = await claim.select("id");
      if (!won || won.length === 0) {
        result.skipped++;
        continue;
      }
      claimed = true;

      const perEvent = new Map<string, { tickets: number; amount: number }>();
      for (const o of orders) {
        const acc = perEvent.get(o.event_id) ?? { tickets: 0, amount: 0 };
        for (const i of o.order_items) {
          acc.tickets += i.quantity;
          acc.amount += Number(i.unit_base_price) * i.quantity;
        }
        perEvent.set(o.event_id, acc);
      }
      const { data: types } = await admin
        .from("ticket_types")
        .select("event_id, sold_count, quantity")
        .in("event_id", [...perEvent.keys()]);
      const progress = new Map<string, { sold: number; total: number }>();
      for (const t of types ?? []) {
        const acc = progress.get(t.event_id) ?? { sold: 0, total: 0 };
        acc.sold += t.sold_count;
        acc.total += t.quantity;
        progress.set(t.event_id, acc);
      }

      await sendAncEmail(
        to,
        renderProducerSummaryEmail({
          siteUrl: siteUrl(),
          dayLabel: dayLabel(win.day),
          events: [...perEvent.entries()].map(([id, v]) => ({
            id,
            title: events.find((e) => e.id === id)?.title ?? "Evento",
            tickets: v.tickets,
            amount: v.amount,
            sold: progress.get(id)?.sold ?? 0,
            total: progress.get(id)?.total ?? 0,
          })),
        })
      );
      result.sent++;
    } catch (err) {
      result.failed++;
      if (claimed) {
        try {
          await admin.from("profiles").update({ sales_summary_on: profile.sales_summary_on }).eq("id", profile.id);
        } catch {
          /* ya se registra abajo */
        }
      }
      console.error(`Resumen diario falló (${maskEmail(profile.email)}):`, err instanceof Error ? err.message : "error");
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Aviso de cambio o cancelación a los compradores
// ---------------------------------------------------------------------------

export const NOTICE_MAX_PER_EVENT = 3;
export const NOTICE_MIN_GAP_MS = 10 * 60 * 1000;

/** Destinatarios únicos (órdenes aprobadas, incluidas cortesías) con correo válido. */
export async function collectNoticeRecipients(admin: Admin, eventId: string): Promise<string[]> {
  const set = new Set<string>();
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data } = await admin
      .from("orders")
      .select("buyer_email")
      .eq("event_id", eventId)
      .eq("status", "approved")
      .order("created_at", { ascending: true })
      .range(from, from + PAGE - 1)
      .returns<{ buyer_email: string }[]>();
    for (const o of data ?? []) {
      const email = validateContactEmail(o.buyer_email);
      if (email) set.add(email);
    }
    if (!data || data.length < PAGE) break;
  }
  return [...set];
}

export type NoticeResult = { ok: true; recipients: number; sent: number; failed: number } | { ok: false; error: string };

/**
 * Valida y envía un aviso. El llamador ya comprobó que la sesión es la dueña
 * del evento. Aquí: productora no suspendida, mensaje solo texto sin enlaces,
 * máximo 3 avisos por evento y 1 cada 10 minutos, tope de destinatarios.
 */
export async function sendEventNotice(
  admin: Admin,
  args: { event: Event; userId: string; kind: "cancelled" | "changed"; message: unknown }
): Promise<NoticeResult> {
  const { event, userId, kind } = args;
  if (kind !== "cancelled" && kind !== "changed") return { ok: false, error: "Elige si es un cambio o una cancelación." };

  const message = sanitizeNoticeMessage(args.message);
  if (!message) return { ok: false, error: "Escribe el mensaje para tus compradores." };
  if (typeof args.message === "string" && Array.from(args.message.trim()).length > EMAIL_LIMITS.noticeMessage) {
    return { ok: false, error: `El mensaje puede tener hasta ${EMAIL_LIMITS.noticeMessage} caracteres.` };
  }
  if (hasLink(message)) return { ok: false, error: "El mensaje no puede llevar enlaces. Escribe solo texto." };

  const { data: profile } = await admin
    .from("profiles")
    .select("organizer_name, suspended_at")
    .eq("id", event.organizer_id)
    .maybeSingle();
  if ((profile as { suspended_at?: string | null } | null)?.suspended_at) {
    return { ok: false, error: "Tu cuenta está suspendida. Contacta a ANC." };
  }

  const { data: past, error: pastError } = await admin
    .from("event_notices")
    .select("id, created_at")
    .eq("event_id", event.id)
    .order("created_at", { ascending: false });
  if (pastError) return { ok: false, error: "Los avisos aún no están disponibles. Intenta más tarde." };
  if ((past ?? []).length >= NOTICE_MAX_PER_EVENT) {
    return { ok: false, error: `Ya enviaste ${NOTICE_MAX_PER_EVENT} avisos para este evento, que es el máximo.` };
  }
  const last = past?.[0]?.created_at ? new Date(past[0].created_at).getTime() : 0;
  if (Date.now() - last < NOTICE_MIN_GAP_MS) {
    const mins = Math.ceil((NOTICE_MIN_GAP_MS - (Date.now() - last)) / 60000);
    return { ok: false, error: `Espera ${mins} min antes de enviar otro aviso.` };
  }

  const all = await collectNoticeRecipients(admin, event.id);
  if (all.length === 0) return { ok: false, error: "Este evento aún no tiene compradores a quienes avisar." };
  const recipients = all.slice(0, MAX_NOTICE_RECIPIENTS);

  // Se registra antes de enviar; si otra petición se coló dentro de los 10 minutos, se retira este registro.
  const { data: row, error: insertError } = await admin
    .from("event_notices")
    .insert({ event_id: event.id, kind, message, recipients: recipients.length, sent: 0, failed: 0, created_by: userId })
    .select("id, created_at")
    .single();
  if (insertError || !row) return { ok: false, error: "No se pudo registrar el aviso. Intenta de nuevo." };

  const since = new Date(Date.now() - NOTICE_MIN_GAP_MS).toISOString();
  const { count } = await admin
    .from("event_notices")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id)
    .gte("created_at", since);
  if ((count ?? 0) > 1) {
    await admin.from("event_notices").delete().eq("id", row.id);
    return { ok: false, error: "Ya hay un aviso en curso. Espera unos minutos." };
  }

  const rendered = renderEventNoticeEmail({
    siteUrl: siteUrl(),
    kind,
    message,
    producerName: (profile as { organizer_name?: string | null } | null)?.organizer_name ?? null,
    contactEmail: event.contact_email ?? null,
    event: {
      title: event.title,
      venue: event.venue,
      eventDate: event.event_date,
      status: event.status,
      theme: event.theme,
      accentColor: event.accent_color,
    },
  });

  const { sent, failed } = await sendBatchIndividually(recipients, rendered);
  await admin.from("event_notices").update({ sent, failed }).eq("id", row.id);
  return { ok: true, recipients: recipients.length, sent, failed };
}
