import { describe, expect, it } from "vitest";
import type { AdminHealthRow, AdminOrganizerRow, AdminSalesDayRow } from "@/lib/database.types";
import {
  addDays,
  aggregateByAmbassador,
  aggregateByEvent,
  aggregateOrders,
  type ApprovedOrder,
  buildSeries,
  chileDayKey,
  cronStatus,
  evaluateHealth,
  filterOrganizers,
  isActiveOrganizer,
  parseOrganizerQuery,
  sortOrganizers,
  summarizeSales,
} from "./admin-stats";

const day = (dia: string, total: number, comision: number, entradas = 1, ordenes = 1): AdminSalesDayRow => ({
  dia,
  ordenes,
  entradas,
  total_cobrado: total,
  cargo_servicio: 0,
  comision_anc: comision,
});

const org = (o: Partial<AdminOrganizerRow>): AdminOrganizerRow => ({
  id: "x",
  organizer_name: "Productora Demo",
  email: "demo@test.cl",
  created_at: "2026-01-01T00:00:00Z",
  mp_connected: false,
  suspended_at: null,
  suspended_reason: null,
  eventos_total: 0,
  eventos_publicados: 0,
  ordenes_aprobadas: 0,
  entradas_emitidas: 0,
  entradas_ingresadas: 0,
  venta_base: 0,
  comision_anc: 0,
  ultimo_evento_en: null,
  ...o,
});

describe("días de Chile", () => {
  it("usa la fecha de Chile, no la de UTC", () => {
    // 2026-12-25 02:30 UTC = 24 dic 23:30 en Chile (verano, UTC-3)
    expect(chileDayKey(Date.parse("2026-12-25T02:30:00Z"))).toBe("2026-12-24");
    // 2026-06-25 02:30 UTC = 24 jun 22:30 en Chile (invierno, UTC-4)
    expect(chileDayKey(Date.parse("2026-06-25T02:30:00Z"))).toBe("2026-06-24");
  });
  it("addDays cruza mes y año", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("summarizeSales / buildSeries", () => {
  const now = Date.parse("2026-12-24T15:00:00Z"); // 24 dic, 12:00 Chile
  const rows = [
    day("2026-12-24", 1000, 60),
    day("2026-12-20", 2000, 120, 2),
    day("2026-12-18", 4000, 240), // fuera de 7 días (desde el 18 dic: today-6 = 18, sí entra)
    day("2026-12-17", 8000, 480), // fuera de 7 días, dentro de 30
    day("2026-11-01", 16000, 960), // fuera de 30 días
  ];
  it("separa hoy, 7, 30 y total", () => {
    const s = summarizeSales(rows, now);
    expect(s.today).toEqual({ ordenes: 1, entradas: 1, total: 1000, comision: 60 });
    expect(s.last7.total).toBe(1000 + 2000 + 4000);
    expect(s.last30.total).toBe(1000 + 2000 + 4000 + 8000);
    expect(s.all.total).toBe(31000);
    expect(s.all.comision).toBe(1860);
  });
  it("sin filas: todo en cero", () => {
    expect(summarizeSales([], now).all).toEqual({ ordenes: 0, entradas: 0, total: 0, comision: 0 });
  });
  it("la serie rellena con ceros y termina hoy", () => {
    const serie = buildSeries(rows, 30, now);
    expect(serie).toHaveLength(30);
    expect(serie[29].dia).toBe("2026-12-24");
    expect(serie[29].total).toBe(1000);
    expect(serie[0].dia).toBe("2026-11-25");
    expect(serie[28].total).toBe(0);
    expect(serie.find((p) => p.dia === "2026-11-01")).toBeUndefined();
  });
});

describe("filtros y orden de productoras", () => {
  const list = [
    org({ id: "a", organizer_name: "Ñandú Producciones", email: "nandu@test.cl", mp_connected: true, venta_base: 500, created_at: "2026-02-01T00:00:00Z" }),
    org({ id: "b", organizer_name: "Beta Eventos", email: "beta@test.cl", venta_base: 900, suspended_at: "2026-03-01T00:00:00Z", created_at: "2026-04-01T00:00:00Z" }),
    org({ id: "c", organizer_name: null, email: "sinnombre@test.cl", mp_connected: true, venta_base: 500, comision_anc: 10, created_at: "2026-03-01T00:00:00Z" }),
  ];
  it("busca por nombre o correo sin tildes ni mayúsculas", () => {
    expect(filterOrganizers(list, "nandu", "all").map((o) => o.id)).toEqual(["a"]);
    expect(filterOrganizers(list, "ÑANDÚ", "all").map((o) => o.id)).toEqual(["a"]);
    expect(filterOrganizers(list, "sinnombre", "all").map((o) => o.id)).toEqual(["c"]);
    expect(filterOrganizers(list, "zzz", "all")).toEqual([]);
  });
  it("filtra por estado", () => {
    expect(filterOrganizers(list, "", "mp").map((o) => o.id)).toEqual(["a", "c"]);
    expect(filterOrganizers(list, "", "no-mp").map((o) => o.id)).toEqual(["b"]);
    expect(filterOrganizers(list, "", "suspended").map((o) => o.id)).toEqual(["b"]);
  });
  it("ordena por ventas (desempata por comisión) y por recientes sin mutar la lista", () => {
    expect(sortOrganizers(list, "sales").map((o) => o.id)).toEqual(["b", "c", "a"]);
    expect(sortOrganizers(list, "recent").map((o) => o.id)).toEqual(["b", "c", "a"]);
    expect(list.map((o) => o.id)).toEqual(["a", "b", "c"]);
  });
  it("parsea la URL con valores por defecto seguros", () => {
    expect(parseOrganizerQuery({})).toEqual({ q: "", filter: "all", order: "sales" });
    expect(parseOrganizerQuery({ q: "  hola ", f: "mp", o: "recent" })).toEqual({ q: "hola", filter: "mp", order: "recent" });
    expect(parseOrganizerQuery({ f: "drop table", o: ["x"] })).toEqual({ q: "", filter: "all", order: "sales" });
  });
  it("activa = con eventos publicados y no suspendida", () => {
    expect(isActiveOrganizer({ eventos_publicados: 1, suspended_at: null })).toBe(true);
    expect(isActiveOrganizer({ eventos_publicados: 1, suspended_at: "2026-01-01" })).toBe(false);
    expect(isActiveOrganizer({ eventos_publicados: 0, suspended_at: null })).toBe(false);
  });
});

describe("evaluateHealth", () => {
  const rows: AdminHealthRow[] = [
    { clave: "ordenes_sin_entradas", cantidad: 0, detalle: "" },
    { clave: "correos_sin_enviar", cantidad: 2, detalle: "ej.: ab12cd34" },
    { clave: "rechazadas_24h", cantidad: 9, detalle: "" },
    { clave: "reembolsos_7d", cantidad: 1, detalle: "" },
  ];
  it("devuelve los 8 indicadores en orden y marca alertas", () => {
    const h = evaluateHealth(rows);
    expect(h).toHaveLength(8);
    expect(h.find((x) => x.clave === "ordenes_sin_entradas")?.alerta).toBe(false);
    expect(h.find((x) => x.clave === "correos_sin_enviar")).toMatchObject({ alerta: true, cantidad: 2, detalle: "ej.: ab12cd34" });
    expect(h.find((x) => x.clave === "reembolsos_7d")?.alerta).toBe(true);
  });
  it("rechazos solo alertan desde 10; una clave ausente cuenta como 0", () => {
    const h = evaluateHealth(rows);
    expect(h.find((x) => x.clave === "rechazadas_24h")?.alerta).toBe(false);
    expect(evaluateHealth([{ clave: "rechazadas_24h", cantidad: 10, detalle: null }]).find((x) => x.clave === "rechazadas_24h")?.alerta).toBe(true);
    expect(evaluateHealth([]).every((x) => x.cantidad === 0 && !x.alerta)).toBe(true);
  });
});

describe("cronStatus", () => {
  const now = Date.parse("2026-12-24T12:00:00Z");
  it("sin registro: alerta", () => {
    expect(cronStatus(null, now)).toMatchObject({ alerta: true, ranAt: null, hoursAgo: null });
  });
  it("corrió hace menos de 36 h: bien", () => {
    const s = cronStatus({ value: { ran_at: "2026-12-23T10:00:00Z", expired_orders: 3 }, updated_at: "2026-12-23T10:00:01Z" }, now);
    expect(s.alerta).toBe(false);
    expect(s.expiredOrders).toBe(3);
    expect(Math.round(s.hoursAgo ?? 0)).toBe(26);
  });
  it("más de 36 h: alerta", () => {
    expect(cronStatus({ value: { ran_at: "2026-12-22T10:00:00Z" }, updated_at: "2026-12-22T10:00:00Z" }, now).alerta).toBe(true);
  });
  it("sin ran_at usa updated_at; con basura, alerta", () => {
    expect(cronStatus({ value: {}, updated_at: "2026-12-24T11:00:00Z" }, now).alerta).toBe(false);
    expect(cronStatus({ value: { ran_at: "nope" }, updated_at: "tampoco" }, now).alerta).toBe(true);
  });
});

describe("aggregateOrders", () => {
  const mk = (p: Partial<ApprovedOrder>): ApprovedOrder => ({
    event_id: "e1",
    ambassador_id: null,
    kind: "sale",
    service_fee_amount: 0,
    anc_fee_amount: 0,
    discount_amount: 0,
    order_items: [],
    ...p,
  });
  const orders = [
    mk({ order_items: [{ quantity: 2, unit_base_price: 10000 }], service_fee_amount: 2223, anc_fee_amount: 1400, ambassador_id: "amb" }),
    mk({ order_items: [{ quantity: 1, unit_base_price: 9000 }], service_fee_amount: 1000, anc_fee_amount: 600, discount_amount: 1000 }),
    mk({ kind: "courtesy", order_items: [{ quantity: 3, unit_base_price: 0 }] }),
    mk({ event_id: "e2", kind: "free", order_items: [{ quantity: 1, unit_base_price: 0 }] }),
  ];
  it("suma venta base sin restar el descuento otra vez (el precio ya lo trae)", () => {
    const t = aggregateOrders(orders);
    expect(t.ventaBase).toBe(29000);
    expect(t.comisionAnc).toBe(2000);
    expect(t.cargoServicio).toBe(3223);
    expect(t.descuentos).toBe(1000);
    expect(t.entradas).toBe(7);
    expect(t.ordenes).toBe(4);
    expect(t.cortesias).toBe(3);
  });
  it("agrupa por evento y por embajador", () => {
    const byEvent = aggregateByEvent(orders);
    expect(byEvent.get("e1")?.ordenes).toBe(3);
    expect(byEvent.get("e2")?.entradas).toBe(1);
    expect(aggregateByAmbassador(orders).get("amb")).toEqual({ ordenes: 1, entradas: 2, ventaBase: 20000 });
    expect(aggregateByAmbassador(orders).size).toBe(1);
  });
});
