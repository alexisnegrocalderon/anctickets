import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";
import type {
  AdminAudit,
  AdminHealthRow,
  AdminOrganizerRow,
  AdminSalesDayRow,
  Ambassador,
  DiscountCode,
  Event,
  EventStaff,
  Profile,
  SystemStatus,
  TicketType,
} from "@/lib/database.types";
import type { ApprovedOrder } from "@/lib/admin-stats";

/**
 * Lecturas del panel de administración con el cliente de servicio. SOLO
 * servidor ("server-only" rompe el build si algo de esto llega al navegador).
 * Cada función vuelve a exigir admin: una página nueva que se olvide del
 * requireAdmin() igual no puede leer datos.
 *
 * NUNCA se seleccionan tokens de Mercado Pago: de mp_accounts solo se leen
 * mp_user_id y expires_at.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: string) => UUID.test(v);

const PAGE = 1000;

export interface Loaded<T> {
  data: T;
  /** Mensaje corto si la lectura falló (p. ej. la migración 0010 aún no está aplicada). */
  error: string | null;
}

export const getOrganizerRows = cache(async (): Promise<Loaded<AdminOrganizerRow[]>> => {
  await requireAdmin();
  const { data, error } = await createAdminClient().rpc("admin_organizers");
  if (error) return { data: [], error: "No se pudo leer la lista de productoras." };
  return { data: (data ?? []) as AdminOrganizerRow[], error: null };
});

/** Ventas por día (hasta 10 años) para tarjetas y serie. */
export const getSalesRows = cache(async (): Promise<Loaded<AdminSalesDayRow[]>> => {
  await requireAdmin();
  const { data, error } = await createAdminClient().rpc("admin_sales_by_day", { p_days: 3650 });
  if (error) return { data: [], error: "No se pudieron leer las ventas." };
  return { data: (data ?? []) as AdminSalesDayRow[], error: null };
});

export const getHealthRows = cache(async (): Promise<Loaded<AdminHealthRow[]>> => {
  await requireAdmin();
  const { data, error } = await createAdminClient().rpc("admin_health");
  if (error) return { data: [], error: "No se pudo leer la salud del sistema." };
  return { data: (data ?? []) as AdminHealthRow[], error: null };
});

export const getCronRow = cache(async (): Promise<Loaded<Pick<SystemStatus, "value" | "updated_at"> | null>> => {
  await requireAdmin();
  const { data, error } = await createAdminClient()
    .from("system_status")
    .select("value, updated_at")
    .eq("key", "daily_cron")
    .maybeSingle<Pick<SystemStatus, "value" | "updated_at">>();
  if (error) return { data: null, error: "No se pudo leer el estado de la tarea diaria." };
  return { data: data ?? null, error: null };
});

/** id -> último acceso (ISO). Si Auth falla devuelve lo que alcanzó a leer, sin romper la página. */
export const getLastSignIns = cache(async (): Promise<Map<string, string>> => {
  await requireAdmin();
  const out = new Map<string, string>();
  try {
    const admin = createAdminClient();
    for (let page = 1; page <= 10; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error || !data) break;
      for (const u of data.users) if (u.last_sign_in_at) out.set(u.id, u.last_sign_in_at);
      if (data.users.length < 1000) break;
    }
  } catch {
    /* sin último acceso: la lista igual se muestra */
  }
  return out;
});

export async function getLastSignIn(userId: string): Promise<string | null> {
  await requireAdmin();
  try {
    const { data } = await createAdminClient().auth.admin.getUserById(userId);
    return data?.user?.last_sign_in_at ?? null;
  } catch {
    return null;
  }
}

/** Todas las órdenes aprobadas de unos eventos, en páginas de 1000. */
async function fetchApprovedOrders(eventIds: string[]): Promise<ApprovedOrder[]> {
  if (eventIds.length === 0) return [];
  const admin = createAdminClient();
  const out: ApprovedOrder[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data } = await admin
      .from("orders")
      .select(
        "event_id, ambassador_id, kind, service_fee_amount, anc_fee_amount, discount_amount, order_items(quantity, unit_base_price)"
      )
      .in("event_id", eventIds)
      .eq("status", "approved")
      .order("created_at", { ascending: true })
      .range(from, from + PAGE - 1)
      .returns<ApprovedOrder[]>();
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

async function countTickets(eventIds: string[]): Promise<Map<string, { issued: number; used: number }>> {
  const admin = createAdminClient();
  const entries = await Promise.all(
    eventIds.map(async (id) => {
      const [issued, used] = await Promise.all([
        admin.from("tickets").select("id", { count: "exact", head: true }).eq("event_id", id).neq("status", "cancelled"),
        admin.from("tickets").select("id", { count: "exact", head: true }).eq("event_id", id).eq("status", "used"),
      ]);
      return [id, { issued: issued.count ?? 0, used: used.count ?? 0 }] as const;
    })
  );
  return new Map(entries);
}

export type OrganizerProfile = Pick<
  Profile,
  "id" | "organizer_name" | "full_name" | "email" | "created_at" | "mp_connected" | "suspended_at" | "suspended_reason"
>;

export interface MpStatus {
  /** Hay fila en mp_accounts. */
  linked: boolean;
  mpUserId: string | null;
  expiresAt: string | null;
}

export interface OrganizerDetail {
  profile: OrganizerProfile;
  summary: AdminOrganizerRow | null;
  mp: MpStatus;
  events: (Event & { tiers: TicketType[] })[];
  orders: ApprovedOrder[];
  tickets: Map<string, { issued: number; used: number }>;
  ambassadorCount: number;
  discountCodeCount: number;
  staffCount: number;
  lastSignIn: string | null;
  audit: Pick<AdminAudit, "id" | "admin_email" | "action" | "detail" | "created_at">[];
}

export async function getOrganizerDetail(id: string): Promise<OrganizerDetail | null> {
  await requireAdmin();
  if (!isUuid(id)) return null;
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, organizer_name, full_name, email, created_at, mp_connected, suspended_at, suspended_reason")
    .eq("id", id)
    .maybeSingle<OrganizerProfile>();
  if (!profile) return null;

  const [eventsRes, mpRes, ambRes, auditRes, summaryRes, lastSignIn] = await Promise.all([
    admin
      .from("events")
      .select("*")
      .eq("organizer_id", id)
      .order("event_date", { ascending: false })
      .returns<Event[]>(),
    // Solo mp_user_id y expires_at: jamás los tokens.
    admin
      .from("mp_accounts")
      .select("mp_user_id, expires_at")
      .eq("organizer_id", id)
      .maybeSingle<{ mp_user_id: string; expires_at: string | null }>(),
    admin.from("ambassadors").select("id", { count: "exact", head: true }).eq("organizer_id", id),
    admin
      .from("admin_audit")
      .select("id, admin_email, action, detail, created_at")
      .eq("target_type", "organizer")
      .eq("target_id", id)
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<OrganizerDetail["audit"]>(),
    getOrganizerRows(),
    getLastSignIn(id),
  ]);

  const events = eventsRes.data ?? [];
  const eventIds = events.map((e) => e.id);

  const [tiersRes, orders, tickets, codesRes, staffRes] = await Promise.all([
    eventIds.length
      ? admin.from("ticket_types").select("*").in("event_id", eventIds).returns<TicketType[]>()
      : Promise.resolve({ data: [] as TicketType[] }),
    fetchApprovedOrders(eventIds),
    countTickets(eventIds),
    eventIds.length
      ? admin.from("discount_codes").select("id", { count: "exact", head: true }).in("event_id", eventIds)
      : Promise.resolve({ count: 0 }),
    eventIds.length
      ? admin.from("event_staff").select("id", { count: "exact", head: true }).in("event_id", eventIds)
      : Promise.resolve({ count: 0 }),
  ]);

  const tiersByEvent = new Map<string, TicketType[]>();
  for (const t of tiersRes.data ?? []) {
    const list = tiersByEvent.get(t.event_id) ?? [];
    list.push(t);
    tiersByEvent.set(t.event_id, list);
  }

  return {
    profile,
    summary: summaryRes.data.find((r) => r.id === id) ?? null,
    mp: {
      linked: !!mpRes.data,
      mpUserId: mpRes.data?.mp_user_id ?? null,
      expiresAt: mpRes.data?.expires_at ?? null,
    },
    events: events.map((e) => ({ ...e, tiers: tiersByEvent.get(e.id) ?? [] })),
    orders,
    tickets,
    ambassadorCount: ambRes.count ?? 0,
    discountCodeCount: codesRes.count ?? 0,
    staffCount: staffRes.count ?? 0,
    lastSignIn,
    audit: auditRes.data ?? [],
  };
}

export interface EventDetail {
  event: Event;
  organizer: Pick<OrganizerProfile, "id" | "organizer_name" | "suspended_at">;
  tiers: TicketType[];
  tierCheckedIn: Map<string, number>;
  codes: Pick<DiscountCode, "id" | "code" | "kind" | "value" | "max_uses" | "used_count" | "active" | "valid_from" | "valid_until">[];
  ambassadors: Pick<Ambassador, "id" | "name" | "code" | "commission_percent" | "active" | "event_id">[];
  staff: Pick<EventStaff, "id" | "email" | "role">[];
  orders: ApprovedOrder[];
  issued: number;
  checkedIn: number;
  unsentEmails: number;
}

export async function getEventDetail(id: string): Promise<EventDetail | null> {
  await requireAdmin();
  if (!isUuid(id)) return null;
  const admin = createAdminClient();

  const { data: event } = await admin.from("events").select("*").eq("id", id).maybeSingle<Event>();
  if (!event) return null;

  const [orgRes, tiersRes, codesRes, ambRes, staffRes, orders, tickets, unsentRes] = await Promise.all([
    admin
      .from("profiles")
      .select("id, organizer_name, suspended_at")
      .eq("id", event.organizer_id)
      .maybeSingle<EventDetail["organizer"]>(),
    admin.from("ticket_types").select("*").eq("event_id", id).returns<TicketType[]>(),
    admin
      .from("discount_codes")
      .select("id, code, kind, value, max_uses, used_count, active, valid_from, valid_until")
      .eq("event_id", id)
      .order("created_at", { ascending: false })
      .returns<EventDetail["codes"]>(),
    admin
      .from("ambassadors")
      .select("id, name, code, commission_percent, active, event_id")
      .eq("organizer_id", event.organizer_id)
      .or(`event_id.eq.${id},event_id.is.null`)
      .order("created_at", { ascending: true })
      .returns<EventDetail["ambassadors"]>(),
    admin
      .from("event_staff")
      .select("id, email, role")
      .eq("event_id", id)
      .order("created_at", { ascending: true })
      .returns<EventDetail["staff"]>(),
    fetchApprovedOrders([id]),
    countTickets([id]),
    admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("event_id", id)
      .eq("status", "approved")
      .is("email_sent_at", null),
  ]);

  const tiers = tiersRes.data ?? [];
  const tierCheckedIn = new Map<string, number>();
  await Promise.all(
    tiers.map(async (t) => {
      const { count } = await admin
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("ticket_type_id", t.id)
        .eq("status", "used");
      tierCheckedIn.set(t.id, count ?? 0);
    })
  );

  return {
    event,
    organizer: orgRes.data ?? { id: event.organizer_id, organizer_name: null, suspended_at: null },
    tiers,
    tierCheckedIn,
    codes: codesRes.data ?? [],
    ambassadors: ambRes.data ?? [],
    staff: staffRes.data ?? [],
    orders,
    issued: tickets.get(id)?.issued ?? 0,
    checkedIn: tickets.get(id)?.used ?? 0,
    unsentEmails: unsentRes.count ?? 0,
  };
}
