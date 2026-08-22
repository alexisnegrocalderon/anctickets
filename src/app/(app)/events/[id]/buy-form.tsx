"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { TicketType } from "@/lib/database.types";
import { calculateFees } from "@/lib/fees";

export default function BuyForm({
  eventId,
  ticketTypes,
  isLoggedIn,
}: {
  eventId: string;
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
      router.push(`/login?next=/events/${eventId}`);
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
    <div className="flex flex-col gap-4">
      {ticketTypes.map((tt) => {
        const remaining = tt.quantity - tt.sold_count;
        const qty = quantities[tt.id] ?? 0;
        return (
          <div
            key={tt.id}
            className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3"
          >
            <div>
              <p className="font-medium text-neutral-900">{tt.name}</p>
              <p className="text-sm text-neutral-500">
                ${tt.base_price.toLocaleString("es-CL")}
                {remaining <= 0 ? " · agotado" : ` · ${remaining} disponibles`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQty(tt.id, qty - 1, remaining)}
                className="h-8 w-8 rounded-full border border-neutral-300 text-neutral-600 hover:bg-neutral-50"
                disabled={remaining <= 0}
              >
                −
              </button>
              <span className="w-6 text-center font-medium">{qty}</span>
              <button
                type="button"
                onClick={() => setQty(tt.id, qty + 1, remaining)}
                className="h-8 w-8 rounded-full border border-neutral-300 text-neutral-600 hover:bg-neutral-50"
                disabled={remaining <= 0}
              >
                +
              </button>
            </div>
          </div>
        );
      })}

      {totalQty > 0 ? (
        <div className="rounded-lg bg-neutral-50 p-4 text-sm text-neutral-700">
          <div className="flex justify-between">
            <span>Subtotal entradas</span>
            <span>${fees.basePrice.toLocaleString("es-CL")}</span>
          </div>
          <div className="flex justify-between">
            <span>Cargo por servicio (10%)</span>
            <span>${fees.serviceFeeAmount.toLocaleString("es-CL")}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-neutral-200 pt-2 font-semibold text-neutral-900">
            <span>Total a pagar</span>
            <span>${fees.totalAmount.toLocaleString("es-CL")}</span>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="button"
        onClick={handleCheckout}
        disabled={totalQty === 0 || loading}
        className="rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-400 disabled:opacity-50"
      >
        {loading
          ? "Redirigiendo a Mercado Pago..."
          : isLoggedIn
            ? "Comprar"
            : "Inicia sesión para comprar"}
      </button>
    </div>
  );
}
