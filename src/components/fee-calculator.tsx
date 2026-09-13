"use client";

/**
 * ANC — calculadora de reparto. En vez de prometer "cero" y esconder la letra
 * chica, mostramos el reparto real de cualquier precio que el productor
 * escriba: 100% del valor de la entrada cae en su cuenta de Mercado Pago;
 * el cargo de servicio (que paga quien compra) es aparte y nunca lo toca ANC
 * directamente en su cuenta.
 */
import { useMemo, useState } from "react";
import { calculateFees } from "@/lib/fees";

const clp = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

export default function FeeCalculator() {
  const [price, setPrice] = useState(10000);

  const fees = useMemo(() => calculateFees(price), [price]);

  return (
    <div className="rounded-3xl border border-[var(--anc-border)] bg-white p-6 shadow-[0_20px_50px_-30px_rgba(29,29,29,.35)] sm:p-9">
      <label htmlFor="fee-calc-price" className="font-mono text-xs font-black uppercase tracking-[.18em] text-[var(--anc-vermilion)]">
        Precio de tu entrada
      </label>
      <div className="mt-3 flex items-center gap-4">
        <span className="text-2xl font-black text-[var(--anc-muted)]">$</span>
        <input
          id="fee-calc-price"
          type="number"
          min={1000}
          max={200000}
          step={500}
          value={price}
          onChange={(event) => setPrice(Math.max(0, Number(event.target.value) || 0))}
          className="w-full border-b-2 border-[var(--anc-ink)]/15 bg-transparent py-2 text-3xl font-black tracking-tight text-[var(--anc-ink)] outline-none focus-visible:border-[var(--anc-vermilion)] sm:text-4xl"
        />
      </div>
      <input
        type="range"
        min={1000}
        max={100000}
        step={500}
        value={Math.min(price, 100000)}
        onChange={(event) => setPrice(Number(event.target.value))}
        className="mt-5 w-full accent-[var(--anc-vermilion)]"
        aria-label="Ajustar precio de la entrada"
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-[var(--anc-card)] p-5">
          <p className="font-mono text-[0.7rem] font-bold uppercase tracking-[.16em] text-[var(--anc-muted)]">Tú publicas</p>
          <p className="mt-1 text-2xl font-black text-[var(--anc-ink)]">{clp.format(fees.basePrice)}</p>
        </div>
        <div className="rounded-2xl bg-[var(--anc-card)] p-5">
          <p className="font-mono text-[0.7rem] font-bold uppercase tracking-[.16em] text-[var(--anc-muted)]">
            El comprador paga
          </p>
          <p className="mt-1 text-2xl font-black text-[var(--anc-ink)]">{clp.format(fees.totalAmount)}</p>
        </div>
        <div className="rounded-2xl border-2 border-[var(--anc-vermilion)] bg-[var(--anc-card)] p-5">
          <p className="font-mono text-[0.7rem] font-bold uppercase tracking-[.16em] text-[var(--anc-ink)]">
            A tu Mercado Pago
          </p>
          <p className="mt-1 text-2xl font-black text-[var(--anc-ink)]">{clp.format(fees.basePrice)}</p>
        </div>
      </div>

      <p className="mt-6 max-w-[62ch] text-sm leading-6 text-[var(--anc-muted)]">
        La diferencia ({clp.format(fees.serviceFeeAmount)}) es un cargo de servicio que paga quien
        compra, no tú. De ahí sale el procesamiento de Mercado Pago
        ({clp.format(fees.mpFeeAmount)}) y lo que gana ANC ({clp.format(fees.ancFeeAmount)}). No
        hay una comisión de plataforma descontada de tu venta.
      </p>
    </div>
  );
}
