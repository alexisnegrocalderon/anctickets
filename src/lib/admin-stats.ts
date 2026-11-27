import type { AdminHealthRow, AdminOrganizerRow, AdminSalesDayRow } from "@/lib/database.types";

/**
 * Lógica pura del panel de administración: agregación de ventas, filtros y
 * orden de productoras, semáforo de salud. Sin acceso a la base ni al reloj
 * (el "ahora" entra por parámetro) para poder probarla.
 */

const TZ = "America/Santiago";

/** "2026-12-24" del día de Chile al que pertenece el instante. */
export function chileDayKey(ts: number | Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(typeof ts === "number" ? new Date(ts) : ts);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Suma `delta` días a una clave "YYYY-MM-DD" (calendario puro, sin zona horaria). */
export function addDays(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

export interface SalesTotals {
  ordenes: number;
  entradas: number;
  total: number;
  comision: number;
}

const emptyTotals = (): SalesTotals => ({ ordenes: 0, entradas: 0, total: 0, comision: 0 });

function add(acc: SalesTotals, row: AdminSalesDayRow) {
  acc.ordenes += Number(row.ordenes);
  acc.entradas += Number(row.entradas);
  acc.total += Number(row.total_cobrado);
  acc.comision += Number(row.comision_anc);
}

export interface SalesSummary {
  today: SalesTotals;
  last7: SalesTotals;
  last30: SalesTotals;
  all: SalesTotals;
}

/**
 * Resume las filas por día: hoy, últimos 7 días (hoy incluido), últimos 30 y
 * total de lo recibido. Los días son de Chile.
 */
export function summarizeSales(rows: AdminSalesDayRow[], now: number): SalesSummary {
  const today = chileDayKey(now);
  const from7 = addDays(today, -6);
  const from30 = addDays(today, -29);
  const out: SalesSummary = { today: emptyTotals(), last7: emptyTotals(), last30: emptyTotals(), all: emptyTotals() };
  for (const row of rows) {
    add(out.all, row);
    if (row.dia >= from30 && row.dia <= today) add(out.last30, row);
    if (row.dia >= from7 && row.dia <= today) add(out.last7, row);
    if (row.dia === today) add(out.today, row);
  }
  return out;
}

export interface SeriesPoint {
  dia: string;
  total: number;
  comision: number;
  entradas: number;
}

/** Serie de los últimos `days` días de Chile (el más antiguo primero), con ceros en los días sin ventas. */
export function buildSeries(rows: AdminSalesDayRow[], days: number, now: number): SeriesPoint[] {
  const today = chileDayKey(now);
  const byDay = new Map<string, SeriesPoint>();
  for (const r of rows) {
    const prev = byDay.get(r.dia) ?? { dia: r.dia, total: 0, comision: 0, entradas: 0 };
    prev.total += Number(r.total_cobrado);
    prev.comision += Number(r.comision_anc);
    prev.entradas += Number(r.entradas);
    byDay.set(r.dia, prev);
  }
  const out: SeriesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dia = addDays(today, -i);
    out.push(byDay.get(dia) ?? { dia, total: 0, comision: 0, entradas: 0 });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Productoras
// ---------------------------------------------------------------------------

export type OrganizerFilter = "all" | "mp" | "no-mp" | "suspended";
export type OrganizerOrder = "sales" | "recent";

export const ORGANIZER_FILTERS: { value: OrganizerFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "mp", label: "Con Mercado Pago" },
  { value: "no-mp", label: "Sin Mercado Pago" },
  { value: "suspended", label: "Suspendidas" },
];

export const ORGANIZER_ORDERS: { value: OrganizerOrder; label: string }[] = [
  { value: "sales", label: "Más ventas" },
  { value: "recent", label: "Más recientes" },
];

/** Lee filtro y orden de la URL; cualquier valor desconocido cae en el valor por defecto. */
export function parseOrganizerQuery(params: { q?: string | string[]; f?: string | string[]; o?: string | string[] }) {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const f = one(params.f);
  const o = one(params.o);
  return {
    q: one(params.q).trim().slice(0, 80),
    filter: (ORGANIZER_FILTERS.some((x) => x.value === f) ? f : "all") as OrganizerFilter,
    order: (ORGANIZER_ORDERS.some((x) => x.value === o) ? o : "sales") as OrganizerOrder,
  };
}

const norm = (s: string | null | undefined) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Filtra por texto (nombre o correo, sin tildes ni mayúsculas) y por estado. */
export function filterOrganizers(list: AdminOrganizerRow[], q: string, filter: OrganizerFilter): AdminOrganizerRow[] {
  const needle = norm(q);
  return list.filter((o) => {
    if (needle && !norm(o.organizer_name).includes(needle) && !norm(o.email).includes(needle)) return false;
    switch (filter) {
      case "mp":
        return o.mp_connected;
      case "no-mp":
        return !o.mp_connected;
      case "suspended":
        return !!o.suspended_at;
      default:
        return true;
    }
  });
}

/** "sales": más venta primero (desempata por comisión y nombre). "recent": alta más reciente primero. */
export function sortOrganizers(list: AdminOrganizerRow[], order: OrganizerOrder): AdminOrganizerRow[] {
  const name = (o: AdminOrganizerRow) => o.organizer_name ?? "";
  return [...list].sort((a, b) => {
    if (order === "recent") {
      const d = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return d !== 0 ? d : name(a).localeCompare(name(b), "es");
    }
    const byBase = Number(b.venta_base) - Number(a.venta_base);
    if (byBase !== 0) return byBase;
    const byFee = Number(b.comision_anc) - Number(a.comision_anc);
    if (byFee !== 0) return byFee;
    return name(a).localeCompare(name(b), "es");
  });
}

/** Productora "activa": publicó algún evento y no está suspendida. */
export function isActiveOrganizer(o: Pick<AdminOrganizerRow, "eventos_publicados" | "suspended_at">): boolean {
  return Number(o.eventos_publicados) > 0 && !o.suspended_at;
}

// ---------------------------------------------------------------------------
// Salud del sistema
// ---------------------------------------------------------------------------

export interface HealthIndicator {
  clave: string;
  titulo: string;
  /** Qué significa, en una línea. */
  significado: string;
  cantidad: number;
  detalle: string;
  /** true = en alerta (rojo). */
  alerta: boolean;
}

/** Umbral: alerta cuando cantidad > umbral. Rechazos en 24 h son ruido normal hasta cierto punto. */
const HEALTH_DEFS: { clave: string; titulo: string; significado: string; umbral: number }[] = [
  {
    clave: "ordenes_sin_entradas",
    titulo: "Pagos sin entradas",
    significado: "Órdenes aprobadas a las que aún no se les emitieron las entradas.",
    umbral: 0,
  },
  {
    clave: "correos_sin_enviar",
    titulo: "Correos sin enviar",
    significado: "Órdenes aprobadas hace más de 10 minutos cuyo correo con las entradas no salió.",
    umbral: 0,
  },
  {
    clave: "pendientes_vencidas",
    titulo: "Reservas sin liberar",
    significado: "Órdenes pendientes vencidas hace más de 30 minutos que no se expiraron (retienen cupo).",
    umbral: 0,
  },
  {
    clave: "sobreventa",
    titulo: "Sobreventa",
    significado: "Órdenes aprobadas con el cupo ya agotado (pago tardío): hay que resolverlas a mano.",
    umbral: 0,
  },
  {
    clave: "rechazadas_24h",
    titulo: "Pagos rechazados (24 h)",
    significado: "Órdenes rechazadas o canceladas en el último día. Se alerta desde 10.",
    umbral: 9,
  },
  {
    clave: "reembolsos_7d",
    titulo: "Reembolsos y contracargos (7 días)",
    significado: "Órdenes reembolsadas o con contracargo en la última semana.",
    umbral: 0,
  },
  {
    clave: "mp_por_vencer",
    titulo: "Mercado Pago por vencer",
    significado: "Autorizaciones que vencen en menos de 30 días o ya vencieron: la productora debe reconectar.",
    umbral: 0,
  },
  {
    clave: "productoras_sin_mp",
    titulo: "Publicadas sin Mercado Pago",
    significado: "Productoras con eventos publicados y sin Mercado Pago conectado.",
    umbral: 0,
  },
];

/** Siempre devuelve los 8 indicadores, en orden fijo; una clave que falte cuenta como 0. */
export function evaluateHealth(rows: AdminHealthRow[]): HealthIndicator[] {
  const byKey = new Map(rows.map((r) => [r.clave, r]));
  return HEALTH_DEFS.map((def) => {
    const row = byKey.get(def.clave);
    const cantidad = Number(row?.cantidad ?? 0);
    return {
      clave: def.clave,
      titulo: def.titulo,
      significado: def.significado,
      cantidad,
      detalle: row?.detalle ?? "",
      alerta: cantidad > def.umbral,
    };
  });
}

/** La tarea diaria debe correr cada 24 h: se alerta pasadas 36 h o sin registro. */
export const CRON_MAX_AGE_HOURS = 36;

export interface CronStatus {
  ranAt: string | null;
  expiredOrders: number | null;
  /** Horas desde la última ejecución (null si no hay registro). */
  hoursAgo: number | null;
  alerta: boolean;
}

export function cronStatus(
  row: { value: unknown; updated_at: string } | null | undefined,
  now: number
): CronStatus {
  if (!row) return { ranAt: null, expiredOrders: null, hoursAgo: null, alerta: true };
  const value = (row.value ?? {}) as { ran_at?: unknown; expired_orders?: unknown };
  const ranAt =
    typeof value.ran_at === "string" && !Number.isNaN(new Date(value.ran_at).getTime()) ? value.ran_at : row.updated_at;
  const ts = new Date(ranAt).getTime();
  if (Number.isNaN(ts)) return { ranAt: null, expiredOrders: null, hoursAgo: null, alerta: true };
  const hoursAgo = Math.max((now - ts) / 3_600_000, 0);
  const expired = typeof value.expired_orders === "number" ? value.expired_orders : null;
  return { ranAt, expiredOrders: expired, hoursAgo, alerta: hoursAgo > CRON_MAX_AGE_HOURS };
}

// ---------------------------------------------------------------------------
// Órdenes aprobadas de un evento / productora
// ---------------------------------------------------------------------------

export interface ApprovedOrder {
  event_id: string;
  ambassador_id: string | null;
  kind: string;
  service_fee_amount: number;
  anc_fee_amount: number;
  discount_amount: number;
  order_items: { quantity: number; unit_base_price: number }[];
}

export interface OrderTotals {
  ordenes: number;
  entradas: number;
  /** Lo que recibe la productora: sum(unit_base_price * quantity) de las ventas (el precio ya trae el descuento). */
  ventaBase: number;
  cargoServicio: number;
  comisionAnc: number;
  descuentos: number;
  cortesias: number;
}

const qtyOf = (o: ApprovedOrder) => o.order_items.reduce((s, i) => s + Number(i.quantity), 0);
const baseOf = (o: ApprovedOrder) => o.order_items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_base_price), 0);

/** Totales de órdenes APROBADAS (misma fórmula que admin_organizers: venta_base solo kind = 'sale'). */
export function aggregateOrders(orders: ApprovedOrder[]): OrderTotals {
  const t: OrderTotals = { ordenes: 0, entradas: 0, ventaBase: 0, cargoServicio: 0, comisionAnc: 0, descuentos: 0, cortesias: 0 };
  for (const o of orders) {
    const qty = qtyOf(o);
    t.ordenes += 1;
    t.entradas += qty;
    t.comisionAnc += Number(o.anc_fee_amount);
    if (o.kind === "sale") {
      t.ventaBase += baseOf(o);
      t.cargoServicio += Number(o.service_fee_amount);
      t.descuentos += Number(o.discount_amount);
    }
    if (o.kind === "courtesy") t.cortesias += qty;
  }
  return t;
}

/** Totales por evento. */
export function aggregateByEvent(orders: ApprovedOrder[]): Map<string, OrderTotals> {
  const groups = new Map<string, ApprovedOrder[]>();
  for (const o of orders) {
    const list = groups.get(o.event_id) ?? [];
    list.push(o);
    groups.set(o.event_id, list);
  }
  return new Map([...groups].map(([id, list]) => [id, aggregateOrders(list)]));
}

/** Órdenes, entradas y venta por embajador (solo órdenes con embajador). */
export function aggregateByAmbassador(orders: ApprovedOrder[]): Map<string, { ordenes: number; entradas: number; ventaBase: number }> {
  const map = new Map<string, { ordenes: number; entradas: number; ventaBase: number }>();
  for (const o of orders) {
    if (!o.ambassador_id) continue;
    const acc = map.get(o.ambassador_id) ?? { ordenes: 0, entradas: 0, ventaBase: 0 };
    acc.ordenes += 1;
    acc.entradas += qtyOf(o);
    if (o.kind === "sale") acc.ventaBase += baseOf(o);
    map.set(o.ambassador_id, acc);
  }
  return map;
}
