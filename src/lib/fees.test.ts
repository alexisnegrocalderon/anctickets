import { describe, expect, it } from "vitest";
import { calculateFees, calculateOrderTotals, MP_FEE_RATE } from "./fees";

describe("calculateFees", () => {
  it("cobra 10% sobre el total, no sobre la base", () => {
    const f = calculateFees(9000);
    expect(f.totalAmount).toBe(10000);
    expect(f.serviceFeeAmount).toBe(1000);
  });

  it("redondea siempre hacia arriba a pesos enteros", () => {
    const f = calculateFees(5000);
    expect(Number.isInteger(f.totalAmount)).toBe(true);
    expect(f.totalAmount).toBe(5556);
    expect(f.totalAmount * 0.9).toBeGreaterThanOrEqual(5000);
  });

  it("precio 0 no cobra nada", () => {
    expect(calculateFees(0)).toMatchObject({ totalAmount: 0, serviceFeeAmount: 0, ancFeeAmount: 0 });
  });
});

describe("calculateOrderTotals", () => {
  it("el total es la suma de total unitario * cantidad (lo mismo que cobra MP)", () => {
    const lines = [
      { unitBasePrice: 5000, quantity: 3 },
      { unitBasePrice: 7777, quantity: 2 },
    ];
    const t = calculateOrderTotals(lines);
    const mpCharge = lines.reduce((s, l) => s + calculateFees(l.unitBasePrice).totalAmount * l.quantity, 0);
    expect(t.totalAmount).toBe(mpCharge);
    expect(t.baseTotal).toBe(5000 * 3 + 7777 * 2);
    expect(t.serviceFeeAmount).toBe(t.totalAmount - t.baseTotal);
  });

  it("el total puede diferir de calcular sobre la suma (el bug K) y aquí manda la suma por unidad", () => {
    const lines = [{ unitBasePrice: 5000, quantity: 3 }];
    const t = calculateOrderTotals(lines);
    expect(t.totalAmount).toBe(5556 * 3);
    expect(t.totalAmount).not.toBe(calculateFees(15000).totalAmount);
  });

  it("el productor recibe base completa: total = base + service y anc + mp = service", () => {
    const t = calculateOrderTotals([{ unitBasePrice: 12345, quantity: 4 }]);
    expect(t.baseTotal + t.serviceFeeAmount).toBe(t.totalAmount);
    expect(t.mpFeeAmount + t.ancFeeAmount).toBe(t.serviceFeeAmount);
    expect(t.mpFeeAmount).toBe(Math.ceil(t.totalAmount * MP_FEE_RATE));
    expect(t.ancFeeAmount).toBeGreaterThan(0);
  });

  it("orden gratis: todo en cero", () => {
    expect(calculateOrderTotals([{ unitBasePrice: 0, quantity: 5 }])).toEqual({
      baseTotal: 0,
      totalAmount: 0,
      serviceFeeAmount: 0,
      mpFeeAmount: 0,
      ancFeeAmount: 0,
    });
  });

  it("mezcla de entradas gratis y de pago", () => {
    const t = calculateOrderTotals([
      { unitBasePrice: 0, quantity: 2 },
      { unitBasePrice: 9000, quantity: 1 },
    ]);
    expect(t.totalAmount).toBe(10000);
    expect(t.baseTotal).toBe(9000);
  });
});
