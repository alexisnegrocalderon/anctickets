import { describe, expect, it } from "vitest";
import {
  calendarDays,
  eventBadges,
  isReactionKey,
  matchesFilter,
  reactionCountLabel,
  ticoLine,
  ticoSay,
  type CarteleraTier,
} from "./cartelera";

// Viernes 27-nov-2026, 12:00 en Chile (UTC-3 en verano).
const NOW = Date.parse("2026-11-27T15:00:00Z");
const H = 3600_000;
const D = 24 * H;

function tier(p: Partial<CarteleraTier>): CarteleraTier {
  return { quantity: 100, sold_count: 0, reserved_count: 0, sales_start: null, sales_end: null, paused: false, base_price: 10000, ...p };
}

describe("eventBadges", () => {
  it("sin tandas no inventa nada", () => {
    expect(eventBadges([], NOW)).toEqual([]);
  });

  it("una sola tanda en venta con harto cupo: sin etiquetas", () => {
    expect(eventBadges([tier({})], NOW)).toEqual([]);
  });

  it("todas agotadas → Agotado", () => {
    expect(eventBadges([tier({ sold_count: 100 }), tier({ quantity: 5, sold_count: 3, reserved_count: 2 })], NOW)).toEqual([
      { text: "Agotado", tone: "muted" },
    ]);
  });

  it("ninguna en venta y una por abrir → Próximamente", () => {
    const t = tier({ sales_start: new Date(NOW + 3 * D).toISOString() });
    expect(eventBadges([t], NOW)).toEqual([{ text: "Próximamente", tone: "info" }]);
  });

  it("preventa con tanda más cara que abre mañana", () => {
    const pre = tier({ base_price: 8000 });
    const general = tier({ base_price: 12000, sales_start: "2026-11-28T15:00:00Z" });
    expect(eventBadges([pre, general], NOW)[0]).toEqual({ text: "Preventa · sube mañana", tone: "hot" });
  });

  it("preventa con tanda más cara lejana → solo Preventa", () => {
    const pre = tier({ base_price: 8000 });
    const general = tier({ base_price: 12000, sales_start: new Date(NOW + 20 * D).toISOString() });
    expect(eventBadges([pre, general], NOW)[0].text).toBe("Preventa");
  });

  it("última tanda: hubo otras y ya no queda ninguna por abrir", () => {
    const vieja = tier({ base_price: 8000, sales_end: new Date(NOW - D).toISOString() });
    const ultima = tier({ base_price: 12000 });
    expect(eventBadges([vieja, ultima], NOW)[0].text).toBe("Última tanda");
  });

  it("quedan pocas: usa el número real", () => {
    expect(eventBadges([tier({ quantity: 200, sold_count: 190, reserved_count: 3 })], NOW)).toEqual([
      { text: "Quedan 7 entradas", tone: "hot" },
    ]);
    expect(eventBadges([tier({ quantity: 10, sold_count: 9 })], NOW)[0].text).toBe("Queda 1 entrada");
  });

  it("una tanda pausada no cuenta como en venta", () => {
    expect(eventBadges([tier({ paused: true })], NOW)).toEqual([]);
  });

  it("nunca más de 2 etiquetas", () => {
    const pre = tier({ base_price: 8000, quantity: 50, sold_count: 47 });
    const general = tier({ base_price: 12000, sales_start: "2026-11-28T15:00:00Z" });
    expect(eventBadges([pre, general], NOW)).toHaveLength(2);
  });
});

describe("matchesFilter", () => {
  it("esta noche incluye la fiesta que parte a la 1:00 de mañana", () => {
    expect(matchesFilter("2026-11-28T04:00:00Z", "noche", NOW)).toBe(true); // sáb 01:00 Chile
    expect(matchesFilter("2026-11-27T23:30:00Z", "noche", NOW)).toBe(true); // vie 20:30
    expect(matchesFilter("2026-11-28T12:00:00Z", "noche", NOW)).toBe(false); // sáb 09:00
  });

  it("de madrugada, 'esta noche' es la que está corriendo", () => {
    const madrugada = Date.parse("2026-11-28T05:00:00Z"); // sáb 02:00 Chile
    expect(matchesFilter("2026-11-28T06:00:00Z", "noche", madrugada)).toBe(true); // sáb 03:00
    expect(matchesFilter("2026-11-28T23:00:00Z", "noche", madrugada)).toBe(false); // sáb 20:00
  });

  it("semana y mes por días calendario de Chile", () => {
    expect(matchesFilter(new Date(NOW + 6 * D).toISOString(), "semana", NOW)).toBe(true);
    expect(matchesFilter(new Date(NOW + 8 * D).toISOString(), "semana", NOW)).toBe(false);
    expect(matchesFilter(new Date(NOW + 25 * D).toISOString(), "mes", NOW)).toBe(true);
    expect(matchesFilter(new Date(NOW + 40 * D).toISOString(), "mes", NOW)).toBe(false);
    expect(matchesFilter("fecha mala", "todo", NOW)).toBe(false);
  });
});

describe("calendarDays", () => {
  it("21 días desde hoy con punto donde hay evento", () => {
    const days = calendarDays(["2026-11-28T04:00:00Z", "2026-12-05T23:00:00Z"], NOW);
    expect(days).toHaveLength(21);
    expect(days[0]).toEqual({ day: "2026-11-27", hasEvent: false });
    expect(days[1]).toEqual({ day: "2026-11-28", hasEvent: true });
    expect(days.filter((d) => d.hasEvent).map((d) => d.day)).toEqual(["2026-11-28", "2026-12-05"]);
  });
});

describe("ticoLine", () => {
  it("usa los datos reales", () => {
    expect(ticoLine("2026-11-27T23:00:00Z", [tier({})], NOW)).toBe("¡Es hoy! Prepara la mejor pinta.");
    expect(ticoLine("2026-12-20T23:00:00Z", [tier({ sold_count: 100 })], NOW)).toMatch(/agotó/);
    expect(ticoLine("2026-12-20T23:00:00Z", [tier({ quantity: 100, sold_count: 95 })], NOW)).toMatch(/Quedan pocas/);
  });
});

describe("ticoSay (pose según el evento)", () => {
  it("celebra cuando es hoy, pulgar mañana, saluda cuando quedan pocas", () => {
    expect(ticoSay("2026-11-27T23:00:00Z", [tier({})], NOW).pose).toBe("celebra");
    expect(ticoSay("2026-11-28T23:00:00Z", [tier({})], NOW).pose).toBe("pulgar");
    expect(ticoSay("2026-12-20T23:00:00Z", [tier({ quantity: 100, sold_count: 95 })], NOW).pose).toBe("saluda");
  });

  it("agotado y próximamente: en reposo", () => {
    expect(ticoSay("2026-12-20T23:00:00Z", [tier({ sold_count: 100 })], NOW).pose).toBe("idle");
    expect(ticoSay("2026-12-20T23:00:00Z", [tier({ sales_start: new Date(NOW + 3 * D).toISOString() })], NOW).pose).toBe("idle");
  });
});

describe("reacciones", () => {
  it("solo las 4 claves permitidas", () => {
    expect(isReactionKey("fuego")).toBe(true);
    expect(isReactionKey("🔥")).toBe(false);
    expect(isReactionKey("caca")).toBe(false);
  });

  it("bajo 10 solo emoji, sin número", () => {
    expect(reactionCountLabel(0)).toBeNull();
    expect(reactionCountLabel(9)).toBeNull();
    expect(reactionCountLabel(10)).toBe("10");
    expect(reactionCountLabel(1500)).toBe("1,5 mil");
    expect(reactionCountLabel(2000)).toBe("2 mil");
    expect(reactionCountLabel(12000)).toBe("12 mil");
  });
});
