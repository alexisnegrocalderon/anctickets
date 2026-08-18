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
 * procesamiento (~3.9% del total) al momento de liquidar el pago. ANC recibe
 * la diferencia vía `marketplace_fee` (~6.1% del total). El organizador
 * recibe el valor base íntegro directo en su cuenta de Mercado Pago.
 */

export const SERVICE_FEE_RATE = 0.10;
export const MP_FEE_RATE = 0.039;
export const ANC_FEE_RATE = SERVICE_FEE_RATE - MP_FEE_RATE; // 0.061

export interface FeeBreakdown {
  basePrice: number;
  totalAmount: number;
  serviceFeeAmount: number;
  mpFeeAmount: number;
  ancFeeAmount: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateFees(basePrice: number): FeeBreakdown {
  const totalAmount = round2(basePrice / (1 - SERVICE_FEE_RATE));
  const serviceFeeAmount = round2(totalAmount - basePrice);
  const mpFeeAmount = round2(totalAmount * MP_FEE_RATE);
  const ancFeeAmount = round2(serviceFeeAmount - mpFeeAmount);

  return {
    basePrice: round2(basePrice),
    totalAmount,
    serviceFeeAmount,
    mpFeeAmount,
    ancFeeAmount,
  };
}

export function calculateOrderFees(basePriceSum: number): FeeBreakdown {
  return calculateFees(basePriceSum);
}
