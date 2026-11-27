import type { ReactNode } from "react";
import type { EventStatus, TicketType } from "@/lib/database.types";
import { Badge } from "@/components/dashboard/ui";
import { TierStatusBadge } from "@/components/tier-status";
import { tierDatesSummary, tierStatus, remainingTickets } from "@/lib/tiers";
import { clp, diaCorto, int } from "@/lib/admin-format";
import type { SeriesPoint } from "@/lib/admin-stats";

/** Piezas de presentación del panel de administración (sin estado, seguras para el servidor). */

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-[11px] font-bold uppercase tracking-[.18em] text-[var(--anc-muted-text)]">{children}</p>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 mt-8 flex items-end justify-between gap-3">
      <h2 className="min-w-0 text-2xl uppercase text-white">{children}</h2>
      {aside}
    </div>
  );
}

export function StatTile({
  label,
  value,
  sub,
  className = "",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 rounded-2xl border border-[var(--anc-border)] bg-[var(--anc-surface)] p-3.5 sm:p-4 ${className}`}>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-[var(--anc-muted-text)]">{label}</p>
      <p className="mt-1 truncate font-display text-[1.65rem] leading-none text-white sm:text-3xl">{value}</p>
      {sub ? <p className="mt-1.5 text-xs leading-snug text-[var(--anc-muted-text)] [overflow-wrap:anywhere]">{sub}</p> : null}
    </div>
  );
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
  if (status === "published") return <Badge tone="success">Publicado</Badge>;
  if (status === "cancelled") return <Badge tone="danger">Cancelado</Badge>;
  return <Badge>Borrador</Badge>;
}

/** Barras CSS de la serie diaria. La altura es proporcional al día más alto. */
export function SalesBars({ points }: { points: SeriesPoint[] }) {
  const max = Math.max(...points.map((p) => p.total), 0);
  const total = points.reduce((s, p) => s + p.total, 0);
  const label = `Cobrado por día en los últimos ${points.length} días: ${clp(total)} en total, máximo ${clp(max)} en un día.`;
  return (
    <figure className="m-0">
      <div role="img" aria-label={label} className="flex h-32 items-end gap-[3px] sm:h-40">
        {points.map((p, i) => {
          const pct = max > 0 ? Math.max((p.total / max) * 100, p.total > 0 ? 4 : 0) : 0;
          const last = i === points.length - 1;
          return (
            <div key={p.dia} className="flex h-full min-w-0 flex-1 items-end" title={`${diaCorto(p.dia)}: ${clp(p.total)}`}>
              <div
                className={`w-full rounded-t-[3px] ${last ? "bg-white" : "bg-white/45"}`}
                style={{ height: p.total > 0 ? `${pct}%` : "2px", opacity: p.total > 0 ? 1 : 0.25 }}
              />
            </div>
          );
        })}
      </div>
      <figcaption className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-wide text-[var(--anc-muted-text)]">
        <span>{points.length > 0 ? diaCorto(points[0].dia) : ""}</span>
        <span>Máx. {clp(max)}</span>
        <span>Hoy</span>
      </figcaption>
    </figure>
  );
}

/** Tarjeta de solo lectura de una tanda: estado, cupo vendido y fechas. Sin botones. */
export function TierReadCard({
  tier,
  now,
  checkedIn,
  compact = false,
}: {
  tier: TicketType;
  now: number;
  checkedIn?: number;
  compact?: boolean;
}) {
  const status = tierStatus(tier, now);
  const pct = tier.quantity > 0 ? Math.min(100, Math.round((tier.sold_count / tier.quantity) * 100)) : 100;
  return (
    <li className="rounded-xl border border-white/10 bg-white/[.03] p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold text-[#f5f4f1]">{tier.name}</p>
          <p className="mt-0.5 text-xs text-neutral-400">
            {Number(tier.base_price) === 0 ? "Gratis" : clp(tier.base_price)}
            {typeof checkedIn === "number" ? ` · ${int(checkedIn)} ingresaron` : ""}
          </p>
        </div>
        <TierStatusBadge status={status} />
      </div>
      <div className="mt-2.5 flex items-baseline justify-between gap-2 text-xs">
        <span className="text-neutral-300">
          {int(tier.sold_count)} de {int(tier.quantity)} vendidas
        </span>
        <span className="text-neutral-500">
          {tier.reserved_count > 0 ? `${int(tier.reserved_count)} reservadas · ` : ""}quedan {int(remainingTickets(tier))}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={tier.quantity}
        aria-valuenow={tier.sold_count}
        aria-label={`${tier.name}: ${tier.sold_count} de ${tier.quantity} vendidas`}
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10"
      >
        <div className="h-full rounded-full bg-neutral-200" style={{ width: `${pct}%` }} />
      </div>
      {compact ? null : <p className="mt-2 text-xs text-neutral-400">{tierDatesSummary(tier)}</p>}
    </li>
  );
}
