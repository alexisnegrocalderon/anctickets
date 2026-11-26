import { describe, expect, it } from "vitest";
import { chileLocalToIso } from "./datetime";
import {
  formatChileDate,
  formatChileWhen,
  formatCountdown,
  isLastTickets,
  remainingTickets,
  sortTiers,
  tierStatus,
  todayEndChileInput,
  validateTierDates,
  type TierLike,
} from "./tiers";

const T = (over: Partial<TierLike> = {}): TierLike => ({
  quantity: 100,
  sold_count: 0,
  reserved_count: 0,
  sales_start: null,
  sales_end: null,
  paused: false,
  ...over,
});
const at = (local: string) => new Date(chileLocalToIso(local)!).getTime();

describe("tierStatus", () => {
  it("sin fechas está en venta", () => {
    expect(tierStatus(T(), Date.now())).toBe("on_sale");
  });
  it("prioridad: pausada gana a agotada y fechas", () => {
    const t = T({ paused: true, sold_count: 100, sales_start: "2999-01-01T00:00:00Z" });
    expect(tierStatus(t, Date.now())).toBe("paused");
  });
  it("prioridad: agotada gana a próximamente y cerrada", () => {
    expect(tierStatus(T({ sold_count: 60, reserved_count: 40, sales_start: "2999-01-01T00:00:00Z" }), 0)).toBe("sold_out");
    expect(tierStatus(T({ sold_count: 100, sales_end: "2000-01-01T00:00:00Z" }), Date.now())).toBe("sold_out");
  });
  it("cupo 0 cuenta como agotada", () => {
    expect(tierStatus(T({ quantity: 0 }), Date.now())).toBe("sold_out");
  });
  it("límite exacto de apertura: en start ya está en venta; un ms antes es próximamente", () => {
    const start = "2026-12-14T01:00:00.000Z";
    const s = new Date(start).getTime();
    expect(tierStatus(T({ sales_start: start }), s - 1)).toBe("upcoming");
    expect(tierStatus(T({ sales_start: start }), s)).toBe("on_sale");
  });
  it("límite exacto de cierre: en end ya está cerrada; un ms antes sigue en venta", () => {
    const end = "2026-12-14T01:00:00.000Z";
    const e = new Date(end).getTime();
    expect(tierStatus(T({ sales_end: end }), e - 1)).toBe("on_sale");
    expect(tierStatus(T({ sales_end: end }), e)).toBe("ended");
  });
  it("cierra a las 23:59: a las 23:58:59 en venta, a las 23:59:00 cerrada", () => {
    const tier = T({ sales_end: chileLocalToIso("2026-12-13T23:59") });
    expect(tierStatus(tier, at("2026-12-13T23:58") + 59_000)).toBe("on_sale");
    expect(tierStatus(tier, at("2026-12-13T23:59"))).toBe("ended");
  });
  it("acepta Date y número", () => {
    expect(tierStatus(T({ sales_end: "2000-01-01T00:00:00Z" }), new Date())).toBe("ended");
  });
  it("cambio de horario de verano: el cierre local 23:59 respeta el offset de cada fecha", () => {
    // Chile pasa a verano el dom 6 sep 2026 (00:00 -> 01:00). 23:59 del 5 sep sigue en UTC-4.
    const before = chileLocalToIso("2026-09-05T23:59")!;
    expect(before).toBe("2026-09-06T03:59:00.000Z");
    // 23:59 del 6 sep ya es UTC-3.
    const after = chileLocalToIso("2026-09-06T23:59")!;
    expect(after).toBe("2026-09-07T02:59:00.000Z");
    const tier = T({ sales_end: after });
    expect(tierStatus(tier, new Date("2026-09-07T02:58:59Z"))).toBe("on_sale");
    expect(tierStatus(tier, new Date("2026-09-07T02:59:00Z"))).toBe("ended");
    // El día del cambio dura 23 h reales.
    expect(new Date(after).getTime() - new Date(before).getTime()).toBe(23 * 3600_000);
  });
  it("cambio de horario de invierno: abril 2026 (UTC-3 a UTC-4)", () => {
    // Chile retrocede el sáb 4 abr 2026 (24:00 -> 23:00).
    expect(chileLocalToIso("2026-04-04T12:00")).toBe("2026-04-04T15:00:00.000Z");
    expect(chileLocalToIso("2026-04-05T12:00")).toBe("2026-04-05T16:00:00.000Z");
  });
});

describe("remainingTickets / isLastTickets", () => {
  it("restantes nunca es negativo", () => {
    expect(remainingTickets(T({ sold_count: 120 }))).toBe(0);
    expect(remainingTickets(T({ sold_count: 30, reserved_count: 5 }))).toBe(65);
  });
  it("<= 10 restantes", () => {
    expect(isLastTickets(T({ quantity: 40, sold_count: 30 }))).toBe(true); // quedan 10
    expect(isLastTickets(T({ quantity: 40, sold_count: 29 }))).toBe(false); // quedan 11 (27%)
  });
  it("<= 15% del cupo", () => {
    expect(isLastTickets(T({ quantity: 200, sold_count: 170 }))).toBe(true); // 30 = 15%
    expect(isLastTickets(T({ quantity: 200, sold_count: 169 }))).toBe(false); // 31
  });
  it("agotada o cupo 0 no es 'últimas'", () => {
    expect(isLastTickets(T({ sold_count: 100 }))).toBe(false);
    expect(isLastTickets(T({ quantity: 0 }))).toBe(false);
  });
});

describe("formatCountdown", () => {
  it("formatos", () => {
    expect(formatCountdown(2 * 86400_000 + 4 * 3600_000 + 59_000)).toBe("2 d 4 h");
    expect(formatCountdown(5 * 3600_000 + 12 * 60_000 + 9000)).toBe("5 h 12 min");
    expect(formatCountdown(12 * 60_000 + 40_000)).toBe("12 min 40 s");
    expect(formatCountdown(40_000)).toBe("40 s");
    expect(formatCountdown(3600_000)).toBe("1 h 0 min");
    expect(formatCountdown(-5)).toBe("0 s");
  });
});

describe("formatChileDate", () => {
  it("fecha y hora en Chile", () => {
    expect(formatChileDate("2026-12-15T01:00:00.000Z")).toBe("lun 14 dic, 22:00");
    expect(formatChileWhen("2026-12-14T02:59:00.000Z")).toBe("dom 13 dic a las 23:59");
  });
  it("vacío o inválido", () => {
    expect(formatChileDate(null)).toBe("");
    expect(formatChileDate("nada")).toBe("");
  });
});

describe("validateTierDates", () => {
  it("sin fechas es válido", () => {
    expect(validateTierDates("", "")).toEqual({ startIso: null, endIso: null });
  });
  it("fin posterior al inicio", () => {
    const r = validateTierDates("2026-12-10T10:00", "2026-12-10T10:00");
    expect(r.error).toMatch(/posterior/);
    expect(validateTierDates("2026-12-10T10:00", "2026-12-10T10:01").error).toBeUndefined();
  });
  it("formato inválido", () => {
    expect(validateTierDates("x", "").error).toMatch(/apertura/);
    expect(validateTierDates("", "x").error).toMatch(/cierre/);
  });
  it("advertencia si cierra después del evento (no es error)", () => {
    const ev = chileLocalToIso("2026-12-14T22:00");
    const r = validateTierDates("", "2026-12-14T23:00", ev);
    expect(r.error).toBeUndefined();
    expect(r.warning).toMatch(/evento/);
    expect(validateTierDates("", "2026-12-14T22:00", ev).warning).toBeUndefined();
  });
});

describe("sortTiers y atajos", () => {
  it("ordena por apertura y luego por creación; sin apertura primero", () => {
    const list = [
      { id: "c", sales_start: "2026-12-02T00:00:00Z", created_at: "2026-01-01T00:00:00Z" },
      { id: "b", sales_start: null, created_at: "2026-01-02T00:00:00Z" },
      { id: "a", sales_start: null, created_at: "2026-01-01T00:00:00Z" },
      { id: "d", sales_start: "2026-12-02T00:00:00Z", created_at: "2026-01-05T00:00:00Z" },
    ];
    expect(sortTiers(list).map((t) => t.id)).toEqual(["a", "b", "c", "d"]);
  });
  it("23:59 de hoy en hora de Chile", () => {
    // 2026-12-14 02:00 UTC es 23:00 del 13 en Chile
    expect(todayEndChileInput(new Date("2026-12-14T02:00:00Z"))).toBe("2026-12-13T23:59");
  });
});
