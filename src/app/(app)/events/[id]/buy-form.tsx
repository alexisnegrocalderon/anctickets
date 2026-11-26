"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import type { TicketType } from "@/lib/database.types";
import { priceOrder } from "@/lib/pricing";
import {
  formatChileDate,
  isLastTickets,
  remainingTickets,
  sortTiers,
  tierStatus,
  type TierStatus,
} from "@/lib/tiers";
import { TierCountdown, TierStatusBadge, useTierClock } from "@/components/tier-status";

/** Cada tipo de entrada toma un color del sistema "Retro Future", en orden de aparición. */
const TIER_ACCENTS = [
  { base: "#FF206E", light: "#FF6FA0", ink: "#f5f4f1" }, // magenta -> texto claro
  { base: "#FBFF12", light: "#FFFF75", ink: "#160f00" }, // amarillo -> texto oscuro
  { base: "#41EAD4", light: "#8FF6EA", ink: "#062622" }, // turquesa -> texto oscuro
  { base: "#222222", light: "#4a4a4a", ink: "#f5f4f1" }, // charcoal -> texto claro
] as const;

interface PreviewTotals {
  baseTotal: number;
  discountTotal: number;
  serviceFeeAmount: number;
  totalAmount: number;
}

/** Texto de estado de una tanda que no está en venta. */
function statusDetail(tt: TicketType, status: TierStatus): string | null {
  switch (status) {
    case "upcoming":
      return `Abre el ${formatChileDate(tt.sales_start)}`;
    case "ended":
      return tt.sales_end ? `Venta cerrada el ${formatChileDate(tt.sales_end)}` : "Venta cerrada";
    case "sold_out":
      return "Se agotaron las entradas de esta tanda";
    case "paused":
      return "Pausada por el productor";
    default:
      return null;
  }
}

/** Mensaje destacado cuando ninguna tanda se puede comprar. */
function NoSaleBanner({
  tiers,
  statusById,
}: {
  tiers: TicketType[];
  statusById: Map<string, TierStatus>;
}) {
  const upcoming = tiers
    .filter((t) => statusById.get(t.id) === "upcoming" && t.sales_start)
    .map((t) => t.sales_start!)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  const statuses = [...statusById.values()];
  let title: string;
  if (upcoming.length > 0) title = `La venta abre el ${formatChileDate(upcoming[0])}`;
  else if (statuses.every((st) => st === "sold_out")) title = "Entradas agotadas";
  else if (statuses.some((st) => st === "paused") && !statuses.some((st) => st === "ended")) title = "La venta está pausada por el productor";
  else title = "La venta terminó";
  return (
    <div role="status" className="rounded-2xl border border-white/25 bg-white/[.07] px-4 py-4">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[.18em] text-neutral-400">Por ahora no se puede comprar</p>
      <p className="mt-1 text-lg font-black leading-tight text-white">{title}</p>
    </div>
  );
}

export default function BuyForm({
  eventId,
  eventSlug,
  ticketTypes: rawTicketTypes,
  isLoggedIn,
  serverNow,
}: {
  eventId: string;
  eventSlug: string;
  ticketTypes: TicketType[];
  isLoggedIn: boolean;
  /** Hora del servidor al renderizar: primer render y corrección del reloj del navegador. */
  serverNow: number;
}) {
  const ticketTypes = useMemo(() => sortTiers(rawTicketTypes), [rawTicketTypes]);
  const now = useTierClock(serverNow, ticketTypes);
  const statusById = useMemo(() => {
    const map = new Map<string, TierStatus>();
    for (const tt of ticketTypes) map.set(tt.id, tierStatus(tt, now));
    return map;
  }, [ticketTypes, now]);
  const anyOnSale = [...statusById.values()].some((st) => st === "on_sale");
  const [closedNotice, setClosedNotice] = useState<string[]>([]);
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [codeMessage, setCodeMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [codeChecking, setCodeChecking] = useState(false);
  const [discounted, setDiscounted] = useState<PreviewTotals | null>(null);

  // Si una tanda con cantidades elegidas deja de estar en venta mientras la página
  // está abierta, se limpia la selección y se avisa (ajuste de estado durante el render).
  const staleIds = Object.entries(quantities)
    .filter(([id, qty]) => qty > 0 && statusById.has(id) && statusById.get(id) !== "on_sale")
    .map(([id]) => id);
  if (staleIds.length > 0) {
    setQuantities((prev) => {
      const next = { ...prev };
      for (const id of staleIds) delete next[id];
      return next;
    });
    setClosedNotice((prev) => [
      ...prev,
      ...staleIds.map((id) => ticketTypes.find((t) => t.id === id)?.name ?? "").filter(Boolean),
    ]);
  }

  const cartItems = useMemo(
    () =>
      Object.entries(quantities)
        .filter(([, qty]) => qty > 0)
        .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity })),
    [quantities]
  );

  // Sin código: precio calculado en el navegador con la misma función que usa el servidor.
  const plain = useMemo(
    () =>
      priceOrder(
        cartItems.map((i) => ({
          ticketTypeId: i.ticketTypeId,
          basePrice: Number(ticketTypes.find((t) => t.id === i.ticketTypeId)?.base_price ?? 0),
          quantity: i.quantity,
        })),
        null
      ),
    [cartItems, ticketTypes]
  );

  const totals: PreviewTotals =
    appliedCode && discounted && cartItems.length > 0
      ? discounted
      : {
          baseTotal: plain.baseTotal,
          discountTotal: 0,
          serviceFeeAmount: plain.serviceFeeAmount,
          totalAmount: plain.totalAmount,
        };
  const totalQty = Object.values(quantities).reduce((a, b) => a + b, 0);
  const isFree = totalQty > 0 && totals.totalAmount === 0;

  async function validateCode(code: string, items: typeof cartItems) {
    setCodeChecking(true);
    try {
      const res = await fetch("/api/checkout/validate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, items, code }),
      });
      const data = await res.json();
      if (!data.valid) {
        setAppliedCode(null);
        setDiscounted(null);
        setCodeMessage({ ok: false, text: data.message ?? "Código inválido" });
        return;
      }
      setAppliedCode(code);
      setDiscounted({
        baseTotal: data.baseTotal,
        discountTotal: data.discountTotal,
        serviceFeeAmount: data.serviceFeeAmount,
        totalAmount: data.totalAmount,
      });
      setCodeMessage({
        ok: true,
        text: `Código ${code} aplicado: -$${Number(data.discountTotal).toLocaleString("es-CL")}`,
      });
    } catch {
      setCodeMessage({ ok: false, text: "No se pudo validar el código" });
    } finally {
      setCodeChecking(false);
    }
  }

  // Si el carrito cambia con un código aplicado, se recalcula el descuento.
  useEffect(() => {
    if (!appliedCode || cartItems.length === 0) return;
    const timer = setTimeout(() => void validateCode(appliedCode, cartItems), 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItems, appliedCode]);

  function setQty(ticketTypeId: string, value: number, max: number) {
    setClosedNotice([]);
    const clamped = Math.max(0, Math.min(value, max));
    setQuantities((prev) => ({ ...prev, [ticketTypeId]: clamped }));
  }

  async function handleCheckout() {
    if (!isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent(`/${eventSlug}`)}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, items: cartItems, discountCode: appliedCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "No se pudo iniciar el pago");
      }

      window.location.href = data.redirectUrl ?? data.initPoint;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {!anyOnSale ? <NoSaleBanner tiers={ticketTypes} statusById={statusById} /> : null}

      {closedNotice.length > 0 ? (
        <p role="status" className="rounded-xl border border-white/20 bg-white/[.06] px-4 py-3 text-sm text-white">
          {closedNotice.length === 1
            ? `La tanda "${closedNotice[0]}" acaba de cerrar y la quitamos de tu selección.`
            : `Las tandas ${closedNotice.map((n) => `"${n}"`).join(", ")} acaban de cerrar y las quitamos de tu selección.`}
        </p>
      ) : null}

      {ticketTypes.map((tt, index) => {
        const status = statusById.get(tt.id) ?? "on_sale";
        const onSale = status === "on_sale";
        const remaining = remainingTickets(tt);
        const qty = onSale ? (quantities[tt.id] ?? 0) : 0;
        const last = onSale && isLastTickets(tt);
        const accent = TIER_ACCENTS[index % TIER_ACCENTS.length];
        const ink = qty > 0 ? accent.ink : "#f5f4f1";
        const tierStyle = {
          "--tier-accent": accent.base,
          "--tier-accent-light": accent.light,
          "--tier-ink": ink,
          borderLeftColor: onSale ? accent.base : "rgba(255,255,255,.18)",
          ...(qty > 0 ? { backgroundColor: accent.base, borderColor: accent.base } : {}),
        } as CSSProperties;
        const nameColor = qty > 0 ? accent.ink : onSale ? "#f5f4f1" : "#c9c8c4";
        const priceColor = qty > 0 ? accent.ink : undefined;
        const detail = statusDetail(tt, status);
        return (
          <div
            key={tt.id}
            style={tierStyle}
            data-tier-status={status}
            className={`flex items-center justify-between gap-3 rounded-xl border border-l-4 px-4 py-3.5 transition ${
              qty > 0 ? "" : onSale ? "border-white/10 bg-[#101010]" : "border-white/10 bg-[#0c0c0c]"
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="mb-1.5">
                <TierStatusBadge status={status} />
              </div>
              <p className="break-words font-semibold" style={{ color: nameColor }}>
                {tt.name}
              </p>
              <p className={qty > 0 ? "text-sm" : "text-sm text-neutral-400"} style={priceColor ? { color: priceColor } : undefined}>
                {Number(tt.base_price) === 0 ? "Gratis" : `$${Number(tt.base_price).toLocaleString("es-CL", { maximumFractionDigits: 0 })}`}
                {onSale && !last ? ` · ${remaining} disponibles` : ""}
              </p>
              {onSale ? (
                <div className="mt-1 flex flex-col gap-0.5 text-sm" style={{ color: qty > 0 ? accent.ink : undefined }}>
                  {last ? (
                    <span className="font-bold" style={{ color: qty > 0 ? accent.ink : "var(--anc-vermilion)" }}>
                      {remaining === 1 ? "¡Última entrada!" : `¡Últimas ${remaining} entradas!`}
                    </span>
                  ) : null}
                  {tt.sales_end ? (
                    <TierCountdown endIso={tt.sales_end} now={now} className={qty > 0 ? "font-semibold" : "font-semibold text-neutral-200"} />
                  ) : null}
                </div>
              ) : detail ? (
                <p className="mt-1 text-sm text-neutral-300">{detail}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                aria-label={`Quitar una entrada de ${tt.name}`}
                onClick={() => setQty(tt.id, qty - 1, remaining)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--tier-ink)]/30 text-lg text-[var(--tier-ink)] transition duration-100 hover:border-[var(--tier-ink)] active:scale-90 disabled:opacity-30 disabled:active:scale-100"
                disabled={!onSale || qty === 0}
              >
                −
              </button>
              <span key={qty} className="anc-qty-pop w-5 text-center font-black" style={{ color: onSale ? ink : "#8a8985" }}>
                {qty}
              </span>
              <button
                type="button"
                aria-label={`Agregar una entrada de ${tt.name}`}
                onClick={() => setQty(tt.id, qty + 1, remaining)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--tier-ink)]/30 text-lg text-[var(--tier-ink)] transition duration-100 hover:border-[var(--tier-ink)] active:scale-90 disabled:opacity-30 disabled:active:scale-100"
                disabled={!onSale}
              >
                +
              </button>
            </div>
          </div>
        );
      })}

      {isLoggedIn && totalQty > 0 ? (
        <div className="rounded-xl border border-white/10 bg-[#0d0d0d] p-4">
          <label htmlFor="discount-code" className="font-mono text-[10px] font-bold uppercase tracking-[.18em] text-neutral-500">
            ¿Tienes un código de descuento?
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="discount-code"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="CÓDIGO"
              className="min-w-0 flex-1 rounded-lg border border-white/15 bg-transparent px-3 py-2 font-mono text-sm uppercase text-[#f5f4f1] placeholder:text-neutral-600 focus:border-[var(--anc-accent)] focus:outline-none"
            />
            <button
              type="button"
              disabled={!codeInput.trim() || codeChecking}
              onClick={() => void validateCode(codeInput.trim().toUpperCase().replace(/\s+/g, ""), cartItems)}
              className="shrink-0 rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-[#f5f4f1] transition hover:border-[var(--anc-accent-light)] disabled:opacity-40"
            >
              {codeChecking ? "…" : "Aplicar"}
            </button>
          </div>
          {codeMessage ? (
            <p role="status" className={`mt-2 text-xs ${codeMessage.ok ? "text-emerald-400" : "text-red-400"}`}>
              {codeMessage.text}
            </p>
          ) : null}
        </div>
      ) : null}

      {totalQty > 0 ? (
        <div className="rounded-xl border border-white/10 bg-[#0d0d0d] p-4 font-mono text-xs text-neutral-400">
          <div className="flex justify-between">
            <span className="uppercase tracking-wide">Subtotal entradas</span>
            <span className="text-[#f5f4f1]">${(totals.baseTotal + totals.discountTotal).toLocaleString("es-CL", { maximumFractionDigits: 0 })}</span>
          </div>
          {totals.discountTotal > 0 ? (
            <div className="mt-1.5 flex justify-between text-emerald-400">
              <span className="uppercase tracking-wide">Descuento</span>
              <span>-${totals.discountTotal.toLocaleString("es-CL", { maximumFractionDigits: 0 })}</span>
            </div>
          ) : null}
          {!isFree ? (
            <div className="mt-1.5 flex justify-between">
              <span className="uppercase tracking-wide">Cargo por servicio (10%)</span>
              <span className="text-[#f5f4f1]">${totals.serviceFeeAmount.toLocaleString("es-CL", { maximumFractionDigits: 0 })}</span>
            </div>
          ) : null}
          <div className="mt-3 flex justify-between border-t border-white/10 pt-3 text-sm font-bold text-[#f5f4f1]">
            <span className="uppercase tracking-wide" style={{ color: "var(--anc-yellow)" }}>Total a pagar</span>
            <span>{isFree ? "Gratis" : `$${totals.totalAmount.toLocaleString("es-CL", { maximumFractionDigits: 0 })}`}</span>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <button
        type="button"
        onClick={handleCheckout}
        disabled={totalQty === 0 || loading || !anyOnSale}
        data-cursor-hover
        className="rounded-full bg-[var(--anc-accent)] px-6 py-3.5 text-sm font-black uppercase tracking-[.05em] text-[var(--anc-ink)] transition hover:bg-[var(--anc-accent-light)] active:scale-[.98] disabled:opacity-40"
      >
        {loading
          ? isFree
            ? "Reservando tus entradas..."
            : "Redirigiendo a Mercado Pago..."
          : !anyOnSale
            ? "Venta no disponible"
            : isLoggedIn
            ? totalQty > 0
              ? isFree
                ? "Reservar gratis →"
                : "Comprar ahora →"
              : "Elige tus entradas"
            : "Inicia sesión para comprar"}
      </button>
    </div>
  );
}
