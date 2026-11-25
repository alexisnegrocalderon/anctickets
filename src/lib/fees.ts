/**
 * Cálculo de cargos de ANC Tickets.
 *
 * El comprador paga el valor base de la entrada más un cargo de servicio del
 * 10%, calculado sobre el TOTAL que termina pagando (no sobre el valor base):
 *
 *   total = base / 0.90
 *   service_fee = total - base   (= 10% de total)
 *
 * Del cargo de servicio, Mercado Pago retiene automáticamente su comisión de
 * procesamiento al momento de liquidar el pago. ANC recibe la diferencia vía
 * `marketplace_fee`. El organizador recibe el valor base íntegro directo en
 * su cuenta de Mercado Pago.
 *
 * El checkout solo admite pago único (sin cuotas, ver `createMpPreference`
 * en `src/lib/mercadopago.ts`) — esto es a propósito: la comisión real de
 * Mercado Pago Chile para Checkout Pro en pago único con tarjeta de
 * débito/crédito es 3,19% (dinero disponible al instante) o 2,89% (a 10
 * días), más 19% de IVA sobre esa comisión (no incluido en el % que informa
 * Mercado Pago). En el peor caso (liquidación instantánea):
 *
 *   3.19% * 1.19 = 3.7961% → redondeado a 3.80% con margen de seguridad
 *
 * Si se permitieran cuotas, la comisión real sube mucho más (hasta ~12.1%
 * con 12 cuotas), superando el 10% de cargo de servicio completo — por eso
 * el checkout no las ofrece: el organizador quedaría recibiendo menos del
 * 100% de su entrada, que es justamente lo que este cálculo garantiza evitar.
 *
 * MP_FEE_RATE fijo en el peor caso (no el promedio) para que el organizador
 * SIEMPRE reciba el 100% del valor base, aunque eso signifique que el margen
 * de ANC sea un poco menor cuando Mercado Pago cobra menos (ej. liquidación
 * a 10 días en vez de instantánea).
 *
 * El peso chileno no tiene centavos: todo monto que se muestra o se cobra
 * tiene que ser un entero. Se redondea siempre hacia ARRIBA (nunca al más
 * cercano ni hacia abajo) para que un ajuste de redondeo nunca le quite un
 * peso al organizador ni a ANC — el único que puede pagar la diferencia de
 * redondeo es el comprador, en su cargo de servicio.
 */

export const SERVICE_FEE_RATE = 0.10;
export const MP_FEE_RATE = 0.038;
export const ANC_FEE_RATE = SERVICE_FEE_RATE - MP_FEE_RATE; // 0.062

export interface FeeBreakdown {
  basePrice: number;
  totalAmount: number;
  serviceFeeAmount: number;
  mpFeeAmount: number;
  ancFeeAmount: number;
}

function roundUpToPeso(value: number): number {
  return Math.ceil(value);
}

export function calculateFees(basePrice: number): FeeBreakdown {
  const totalAmount = roundUpToPeso(basePrice / (1 - SERVICE_FEE_RATE));
  const serviceFeeAmount = roundUpToPeso(totalAmount - basePrice);
  const mpFeeAmount = roundUpToPeso(totalAmount * MP_FEE_RATE);
  const ancFeeAmount = roundUpToPeso(serviceFeeAmount - mpFeeAmount);

  return {
    basePrice: roundUpToPeso(basePrice),
    totalAmount,
    serviceFeeAmount,
    mpFeeAmount,
    ancFeeAmount,
  };
}

export function calculateOrderFees(basePriceSum: number): FeeBreakdown {
  return calculateFees(basePriceSum);
}

export interface OrderLineInput {
  /** Precio base unitario FINAL (ya con descuento aplicado). */
  unitBasePrice: number;
  quantity: number;
}

export interface OrderTotals {
  /** Suma de precios base finales: lo que recibe el productor. */
  baseTotal: number;
  /** Exactamente lo que cobra Mercado Pago (suma de unit_price * quantity). */
  totalAmount: number;
  serviceFeeAmount: number;
  mpFeeAmount: number;
  ancFeeAmount: number;
}

/**
 * Totales de una orden. El cargo de servicio se calcula POR ENTRADA (igual que
 * el `unit_price` que se manda a Mercado Pago) y luego se suma, así el total
 * guardado en la orden es idéntico al que cobra MP: no hay desfase por
 * redondear sobre la suma en vez de por unidad.
 */
export function calculateOrderTotals(lines: OrderLineInput[]): OrderTotals {
  let baseTotal = 0;
  let totalAmount = 0;

  for (const line of lines) {
    const unit = calculateFees(Math.max(line.unitBasePrice, 0));
    baseTotal += unit.basePrice * line.quantity;
    totalAmount += unit.totalAmount * line.quantity;
  }

  if (totalAmount === 0) {
    return { baseTotal, totalAmount: 0, serviceFeeAmount: 0, mpFeeAmount: 0, ancFeeAmount: 0 };
  }

  const serviceFeeAmount = totalAmount - baseTotal;
  const mpFeeAmount = Math.min(roundUpToPeso(totalAmount * MP_FEE_RATE), serviceFeeAmount);
  const ancFeeAmount = Math.max(serviceFeeAmount - mpFeeAmount, 0);

  return { baseTotal, totalAmount, serviceFeeAmount, mpFeeAmount, ancFeeAmount };
}
