"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import type { TicketType } from "@/lib/database.types";
import { calculateFees } from "@/lib/fees";

/** Cada tipo de entrada toma un acento distinto del sistema de marca, en orden de aparición. */
const TIER_ACCENTS = [
  { base: "#C8FF3D", light: "#DFFF8F", tint: "rgba(200,255,61,.08)" },
  { base: "#FF2D7A", light: "#FF7AB5", tint: "rgba(255,45,122,.1)" },
  { base: "#FF4D1C", light: "#FF8F5C", tint: "rgba(255,77,28,.1)" },
  { base: "#2FE6D0", light: "#8FF5E8", tint: "rgba(47,230,208,.1)" },
] as const;

const LOW_STOCK_THRESHOLD = 5;

export default function BuyForm({
  eventId,
  eventSlug,
  ticketTypes,
  isLoggedIn,
}: {
  eventId: string;
  eventSlug: string;
  ticketTypes: TicketType[];
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const basePriceSum = useMemo(() => {
    return ticketTypes.reduce((sum, tt) => {
      const qty = quantities[tt.id] ?? 0;
      return sum + qty * tt.base_price;
    }, 0);
  }, [quantities, ticketTypes]);

  const fees = calculateFees(basePriceSum);
  const totalQty = Object.values(quantities).reduce((a, b) => a + b, 0);

  function setQty(ticketTypeId: string, value: number, max: number) {
    const clamped = Math.max(0, Math.min(value, max));
    setQuantities((prev) => ({ ...prev, [ticketTypeId]: clamped }));
  }

  async function handleCheckout() {
    if (!isLoggedIn) {
      router.push(`/login?next=/${eventSlug}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const items = Object.entries(quantities)
        .filter(([, qty]) => qty > 0)
        .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }));

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, items }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "No se pudo iniciar el pago");
      }

      window.location.href = data.initPoint;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {ticketTypes.map((tt, index) => {
        const remaining = tt.quantity - tt.sold_count;
        const qty = quantities[tt.id] ?? 0;
        const soldOut = remaining <= 0;
        const lowStock = !soldOut && remaining <= LOW_STOCK_THRESHOLD;
        const accent = TIER_ACCENTS[index % TIER_ACCENTS.length];
        const tierStyle = {
          "--tier-accent": accent.base,
          "--tier-accent-light": accent.light,
          ...(qty > 0 ? { borderColor: `${accent.base}99`, backgroundColor: accent.tint } : {}),
        } as CSSProperties;
        return (
          <div
            key={tt.id}
            style={tierStyle}
            className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 transition ${
              qty > 0 ? "" : "border-white/10 bg-[#101010]"
            }`}
          >
            <div className="min-w-0">
              <p className="flex items-center gap-2 truncate font-semibold text-[#f5f4f1]">
                <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: accent.base }} />
                <span className="truncate">{tt.name}</span>
              </p>
              <p className="text-sm text-neutral-400">
                ${tt.base_price.toLocaleString("es-CL")}
                {soldOut ? (
                  <span className="text-red-400"> · agotado</span>
                ) : lowStock ? (
                  <span style={{ color: "var(--anc-accent-warm)" }} className="font-bold">
                    {" "}
                    · ¡quedan {remaining}!
                  </span>
                ) : (
                  ` · ${remaining} disponibles`
                )}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setQty(tt.id, qty - 1, remaining)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-[#f5f4f1] transition duration-100 hover:border-[var(--tier-accent-light)] hover:text-[var(--tier-accent-light)] active:scale-90 active:border-[var(--tier-accent)] active:text-[var(--tier-accent)] disabled:opacity-30 disabled:active:scale-100"
                disabled={soldOut || qty === 0}
              >
                −
              </button>
              <span key={qty} className="anc-qty-pop w-5 text-center font-black text-[#f5f4f1]">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty(tt.id, qty + 1, remaining)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-[#f5f4f1] transition duration-100 hover:border-[var(--tier-accent-light)] hover:text-[var(--tier-accent-light)] active:scale-90 active:border-[var(--tier-accent)] active:text-[var(--tier-accent)] disabled:opacity-30 disabled:active:scale-100"
                disabled={soldOut}
              >
                +
              </button>
            </div>
          </div>
        );
      })}

      {totalQty > 0 ? (
        <div className="rounded-xl border border-white/10 bg-[#0d0d0d] p-4 font-mono text-xs text-neutral-400">
          <div className="flex justify-between">
            <span className="uppercase tracking-wide">Subtotal entradas</span>
            <span className="text-[#f5f4f1]">${fees.basePrice.toLocaleString("es-CL")}</span>
          </div>
          <div className="mt-1.5 flex justify-between">
            <span className="uppercase tracking-wide">Cargo por servicio (10%)</span>
            <span className="text-[#f5f4f1]">${fees.serviceFeeAmount.toLocaleString("es-CL")}</span>
          </div>
          <div className="mt-3 flex justify-between border-t border-white/10 pt-3 text-sm font-bold text-[#f5f4f1]">
            <span className="uppercase tracking-wide text-[#DFFF8F]">Total a pagar</span>
            <span>${fees.totalAmount.toLocaleString("es-CL")}</span>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <button
        type="button"
        onClick={handleCheckout}
        disabled={totalQty === 0 || loading}
        data-cursor-hover
        className="rounded-full bg-[#C8FF3D] px-6 py-3.5 text-sm font-black uppercase tracking-[.05em] text-[#120d1b] transition hover:bg-[#DFFF8F] active:scale-[.98] disabled:opacity-40"
      >
        {loading
          ? "Redirigiendo a Mercado Pago..."
          : isLoggedIn
            ? totalQty > 0
              ? "Comprar ahora →"
              : "Elige tus entradas"
            : "Inicia sesión para comprar"}
      </button>
    </div>
  );
}
