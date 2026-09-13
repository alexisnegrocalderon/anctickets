"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import type { TicketType } from "@/lib/database.types";
import { calculateFees } from "@/lib/fees";

/** Cada tipo de entrada toma un color del sistema "Retro Future", en orden de aparición. */
const TIER_ACCENTS = [
  { base: "#FF206E", light: "#FF6FA0", ink: "#f5f4f1" }, // magenta -> texto claro
  { base: "#FBFF12", light: "#FFFF75", ink: "#160f00" }, // amarillo -> texto oscuro
  { base: "#41EAD4", light: "#8FF6EA", ink: "#062622" }, // turquesa -> texto oscuro
  { base: "#222222", light: "#4a4a4a", ink: "#f5f4f1" }, // charcoal -> texto claro
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
        const ink = qty > 0 ? accent.ink : "#f5f4f1";
        const tierStyle = {
          "--tier-accent": accent.base,
          "--tier-accent-light": accent.light,
          "--tier-ink": ink,
          borderLeftColor: accent.base,
          ...(qty > 0 ? { backgroundColor: accent.base, borderColor: accent.base } : {}),
        } as CSSProperties;
        const nameColor = qty > 0 ? accent.ink : "#f5f4f1";
        const priceColor = qty > 0 ? accent.ink : undefined;
        return (
          <div
            key={tt.id}
            style={tierStyle}
            className={`flex items-center justify-between gap-3 rounded-xl border border-l-4 px-4 py-3.5 transition ${
              qty > 0 ? "" : "border-white/10 bg-[#101010]"
            }`}
          >
            <div className="min-w-0">
              <p className="flex items-center gap-2 truncate font-semibold" style={{ color: nameColor }}>
                <span className="truncate">{tt.name}</span>
              </p>
              <p className={qty > 0 ? "text-sm" : "text-sm text-neutral-400"} style={priceColor ? { color: priceColor } : undefined}>
                ${tt.base_price.toLocaleString("es-CL")}
                {soldOut ? (
                  <span className="text-red-400"> · agotado</span>
                ) : lowStock ? (
                  <span style={{ color: qty > 0 ? accent.ink : "var(--anc-yellow)" }} className="font-bold">
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
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--tier-ink)]/30 text-[var(--tier-ink)] transition duration-100 hover:border-[var(--tier-ink)] active:scale-90 disabled:opacity-30 disabled:active:scale-100"
                disabled={soldOut || qty === 0}
              >
                −
              </button>
              <span key={qty} className="anc-qty-pop w-5 text-center font-black" style={{ color: ink }}>
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty(tt.id, qty + 1, remaining)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--tier-ink)]/30 text-[var(--tier-ink)] transition duration-100 hover:border-[var(--tier-ink)] active:scale-90 disabled:opacity-30 disabled:active:scale-100"
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
            <span className="uppercase tracking-wide" style={{ color: "var(--anc-yellow)" }}>Total a pagar</span>
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
        className="rounded-full bg-[#FF206E] px-6 py-3.5 text-sm font-black uppercase tracking-[.05em] text-[#f5f4f1] transition hover:bg-[#FF6FA0] active:scale-[.98] disabled:opacity-40"
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
