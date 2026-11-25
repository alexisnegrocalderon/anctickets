import { applyDiscount, type DiscountRule, type DiscountedLine } from "./discount";
import { calculateOrderTotals, type OrderTotals } from "./fees";

export interface PricingLineInput {
  ticketTypeId: string;
  basePrice: number;
  quantity: number;
}

export interface PricedOrder extends OrderTotals {
  lines: DiscountedLine[];
  discountTotal: number;
  /** true si no hay nada que cobrar (todo gratis o 100% de descuento). */
  isFree: boolean;
}

/**
 * Precio de una orden: primero el descuento por entrada, luego el cargo de
 * servicio sobre el valor base final. Mismo cálculo en el servidor (cobro) y
 * en el navegador (vista previa).
 */
export function priceOrder(lines: PricingLineInput[], rule: DiscountRule | null): PricedOrder {
  const { lines: discounted, discountTotal } = applyDiscount(lines, rule);
  const totals = calculateOrderTotals(
    discounted.map((l) => ({ unitBasePrice: l.unitFinalPrice, quantity: l.quantity }))
  );
  return { ...totals, lines: discounted, discountTotal, isFree: totals.totalAmount === 0 };
}
