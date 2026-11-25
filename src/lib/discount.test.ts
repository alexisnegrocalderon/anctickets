import { describe, expect, it } from "vitest";
import { applyDiscount, checkDiscountCode, normalizeCode, unitDiscount, type DiscountCodeRow } from "./discount";
import { priceOrder } from "./pricing";
import { calculateFees } from "./fees";

describe("unitDiscount", () => {
  it("porcentaje: redondea hacia abajo", () => {
    expect(unitDiscount(9990, { kind: "percent", value: 15 })).toBe(1498); // 1498.5
  });
  it("monto fijo", () => {
    expect(unitDiscount(10000, { kind: "fixed", value: 2500 })).toBe(2500);
  });
  it("nunca deja la entrada bajo 0", () => {
    expect(unitDiscount(3000, { kind: "fixed", value: 5000 })).toBe(3000);
    expect(unitDiscount(3000, { kind: "percent", value: 150 })).toBe(3000);
  });
  it("sin valor o precio 0 no descuenta", () => {
    expect(unitDiscount(0, { kind: "percent", value: 50 })).toBe(0);
    expect(unitDiscount(1000, { kind: "fixed", value: 0 })).toBe(0);
  });
});

describe("applyDiscount", () => {
  const lines = [
    { ticketTypeId: "a", basePrice: 10000, quantity: 2 },
    { ticketTypeId: "b", basePrice: 20000, quantity: 1 },
  ];
  it("aplica a todos si no hay lista", () => {
    const r = applyDiscount(lines, { kind: "percent", value: 10 });
    expect(r.discountTotal).toBe(1000 * 2 + 2000);
  });
  it("respeta los tipos de entrada elegibles", () => {
    const r = applyDiscount(lines, { kind: "fixed", value: 1000, ticketTypeIds: ["b"] });
    expect(r.lines[0].unitDiscount).toBe(0);
    expect(r.lines[1].unitDiscount).toBe(1000);
    expect(r.discountTotal).toBe(1000);
  });
  it("sin regla no cambia nada", () => {
    expect(applyDiscount(lines, null).discountTotal).toBe(0);
  });
});

describe("priceOrder", () => {
  it("el cargo de servicio se calcula sobre el precio ya descontado", () => {
    const p = priceOrder([{ ticketTypeId: "a", basePrice: 10000, quantity: 2 }], { kind: "percent", value: 50 });
    expect(p.baseTotal).toBe(10000);
    expect(p.totalAmount).toBe(calculateFees(5000).totalAmount * 2);
    expect(p.discountTotal).toBe(10000);
    expect(p.isFree).toBe(false);
  });
  it("100% de descuento deja la orden gratis", () => {
    const p = priceOrder([{ ticketTypeId: "a", basePrice: 10000, quantity: 3 }], { kind: "percent", value: 100 });
    expect(p.isFree).toBe(true);
    expect(p.totalAmount).toBe(0);
    expect(p.ancFeeAmount).toBe(0);
  });
  it("entradas de $0 son gratis sin código", () => {
    expect(priceOrder([{ ticketTypeId: "a", basePrice: 0, quantity: 2 }], null).isFree).toBe(true);
  });
});

describe("checkDiscountCode", () => {
  const base: DiscountCodeRow = {
    event_id: "e1",
    kind: "percent",
    value: 10,
    max_uses: 5,
    used_count: 0,
    valid_from: null,
    valid_until: null,
    ticket_type_ids: null,
    active: true,
  };
  const ctx = { eventId: "e1", now: new Date("2026-06-01T12:00:00Z"), ticketTypeIds: ["a"] };

  it("acepta un código vigente", () => {
    expect(checkDiscountCode(base, ctx)).toEqual({ ok: true });
  });
  it("rechaza inactivo, otro evento, fechas y agotado", () => {
    expect(checkDiscountCode({ ...base, active: false }, ctx)).toEqual({ ok: false, reason: "inactive" });
    expect(checkDiscountCode({ ...base, event_id: "e2" }, ctx)).toEqual({ ok: false, reason: "wrong_event" });
    expect(checkDiscountCode({ ...base, valid_from: "2026-07-01T00:00:00Z" }, ctx)).toEqual({ ok: false, reason: "not_started" });
    expect(checkDiscountCode({ ...base, valid_until: "2026-05-01T00:00:00Z" }, ctx)).toEqual({ ok: false, reason: "expired" });
    expect(checkDiscountCode({ ...base, used_count: 5 }, ctx)).toEqual({ ok: false, reason: "exhausted" });
  });
  it("rechaza si no aplica a ninguna entrada elegida", () => {
    expect(checkDiscountCode({ ...base, ticket_type_ids: ["z"] }, ctx)).toEqual({ ok: false, reason: "not_applicable" });
    expect(checkDiscountCode({ ...base, ticket_type_ids: ["a", "z"] }, ctx)).toEqual({ ok: true });
  });
});

describe("normalizeCode", () => {
  it("mayúsculas y sin espacios", () => {
    expect(normalizeCode("  early bird ")).toBe("EARLYBIRD");
  });
});
