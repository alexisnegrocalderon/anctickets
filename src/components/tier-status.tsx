"use client";

/**
 * Piezas compartidas de tandas: insignia de estado (con ícono, no solo color),
 * reloj que sigue la hora del servidor y cuenta regresiva en texto plano
 * (sin animaciones: con reduced-motion solo cambia el texto).
 */
import { useEffect, useMemo, useState } from "react";
import { formatCountdown, TIER_STATUS_LABEL, type TierLike, type TierStatus } from "@/lib/tiers";

const BADGE_STYLE: Record<TierStatus, string> = {
  on_sale: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30",
  upcoming: "bg-white/10 text-neutral-100 ring-1 ring-white/20",
  ended: "bg-white/5 text-neutral-400 ring-1 ring-white/10",
  sold_out: "bg-white/5 text-neutral-300 ring-1 ring-white/20",
  paused: "bg-white/10 text-neutral-100 ring-1 ring-white/25",
};

function StatusIcon({ status }: { status: TierStatus }) {
  const common = { viewBox: "0 0 16 16", className: "h-3.5 w-3.5 shrink-0", fill: "none", stroke: "currentColor", strokeWidth: 1.8, "aria-hidden": true } as const;
  switch (status) {
    case "on_sale":
      return (
        <svg {...common}>
          <path d="M3 8.5l3.2 3L13 4.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "upcoming":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="5.6" />
          <path d="M8 4.8V8l2.2 1.4" strokeLinecap="round" />
        </svg>
      );
    case "ended":
      return (
        <svg {...common}>
          <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
        </svg>
      );
    case "sold_out":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="5.6" />
          <path d="M4.2 11.8l7.6-7.6" strokeLinecap="round" />
        </svg>
      );
    case "paused":
      return (
        <svg {...common}>
          <path d="M5.5 4v8M10.5 4v8" strokeLinecap="round" />
        </svg>
      );
  }
}

export function TierStatusBadge({ status }: { status: TierStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${BADGE_STYLE[status]}`}
    >
      <StatusIcon status={status} />
      {TIER_STATUS_LABEL[status]}
    </span>
  );
}

/**
 * Reloj de la página. El primer render usa `serverNow` (igual en servidor y
 * cliente, sin desajuste de hidratación); después corre con el reloj del
 * navegador corregido por la diferencia contra el servidor. Solo programa
 * ticks mientras haya una apertura o cierre pendiente: cada segundo si falta
 * menos de una hora para alguno, y justo en el instante del cambio.
 */
export function useTierClock(serverNow: number, tiers: Pick<TierLike, "sales_start" | "sales_end">[]): number {
  const [now, setNow] = useState(serverNow);

  const boundariesKey = tiers.map((t) => `${t.sales_start ?? ""}|${t.sales_end ?? ""}`).join(",");
  const boundaries = useMemo(() => {
    const list: number[] = [];
    for (const pair of boundariesKey.split(",")) {
      for (const iso of pair.split("|")) {
        const ts = iso ? new Date(iso).getTime() : NaN;
        if (!Number.isNaN(ts)) list.push(ts);
      }
    }
    return list;
  }, [boundariesKey]);

  useEffect(() => {
    const offset = serverNow - Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = () => {
      clearTimeout(timer);
      const t = Date.now() + offset;
      setNow(t);
      let next = Infinity;
      for (const b of boundaries) if (b > t) next = Math.min(next, b - t);
      if (next === Infinity) return;
      const step = next <= 3_600_000 ? 1000 : 15_000;
      timer = setTimeout(tick, Math.max(Math.min(step, next + 30), 200));
    };

    timer = setTimeout(tick, 0);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [serverNow, boundaries]);

  return now;
}

/** "Termina en 2 d 4 h" (minutos y segundos solo en la última hora). Texto plano, sin animación. */
export function TierCountdown({ endIso, now, className = "" }: { endIso: string; now: number; className?: string }) {
  const left = new Date(endIso).getTime() - now;
  if (Number.isNaN(left) || left <= 0) return null;
  return (
    <span role="timer" className={`tabular-nums ${className}`}>
      Termina en {formatCountdown(left)}
    </span>
  );
}
