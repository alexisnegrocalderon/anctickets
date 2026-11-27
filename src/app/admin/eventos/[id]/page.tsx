import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { getEventDetail } from "@/lib/admin-data";
import { aggregateByAmbassador, aggregateOrders } from "@/lib/admin-stats";
import { clp, fechaHoraChile, int } from "@/lib/admin-format";
import { serverClock, sortTiers } from "@/lib/tiers";
import { Badge, Card } from "@/components/dashboard/ui";
import { EventStatusBadge, SectionTitle, StatTile, TierReadCard } from "@/components/admin/parts";

export const dynamic = "force-dynamic";

/**
 * "Ver el evento como la productora", SOLO LECTURA. Sin formularios ni botones
 * de edición: todo se lee con el cliente de servicio en el servidor.
 */
export default async function AdminEventPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const d = await getEventDetail(id);
  if (!d) notFound();

  const now = serverClock();
  const { event, organizer } = d;
  const totals = aggregateOrders(d.orders);
  const byAmb = aggregateByAmbassador(d.orders);
  const tiers = sortTiers(d.tiers);
  const sold = d.tiers.reduce((s, t) => s + t.sold_count, 0);
  const capacity = d.tiers.reduce((s, t) => s + t.quantity, 0);
  const orgName = organizer.organizer_name ?? "Sin nombre";

  return (
    <div>
      <div
        role="note"
        className="sticky top-2 z-30 mb-4 flex items-center gap-2.5 rounded-xl border border-white/25 bg-[var(--anc-surface-2)]/95 px-3.5 py-2.5 text-sm font-semibold text-white shadow-lg backdrop-blur"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        Vista de administrador: solo lectura
      </div>

      <Link
        href={`/admin/productoras/${organizer.id}`}
        className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--anc-muted-text)] hover:text-white"
      >
        ← {orgName}
      </Link>

      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[clamp(1.9rem,7vw,2.75rem)] uppercase leading-none text-white [overflow-wrap:anywhere]">{event.title}</h2>
          <p className="mt-1.5 text-sm text-[var(--anc-muted-text)]">
            {fechaHoraChile(event.event_date)}
            {event.venue ? ` · ${event.venue}` : ""}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <EventStatusBadge status={event.status} />
            {organizer.suspended_at ? <Badge tone="danger">Productora suspendida</Badge> : null}
          </div>
        </div>
        {event.status === "published" ? (
          <a
            href={`/${event.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white transition hover:border-[var(--anc-accent-light)] hover:text-[var(--anc-accent-light)]"
          >
            Ver página pública ↗
          </a>
        ) : (
          <p className="text-sm text-[var(--anc-muted-text)]">No publicado: no tiene página pública.</p>
        )}
      </div>

      <SectionTitle>Resumen de ventas</SectionTitle>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Recaudado (productora)" value={clp(totals.ventaBase)} sub={`${int(totals.ordenes)} órdenes aprobadas`} />
        <StatTile label="Comisión ANC" value={clp(totals.comisionAnc)} sub={`Cargo de servicio ${clp(totals.cargoServicio)}`} />
        <StatTile label="Vendidas" value={`${int(sold)}/${int(capacity)}`} sub={`${int(totals.cortesias)} cortesías`} />
        <StatTile label="Ingresaron" value={`${int(d.checkedIn)}/${int(d.issued)}`} sub={d.unsentEmails > 0 ? `${int(d.unsentEmails)} ${d.unsentEmails === 1 ? "correo sin enviar" : "correos sin enviar"}` : "Correos al día"} />
      </div>

      <SectionTitle>Tandas</SectionTitle>
      {tiers.length === 0 ? (
        <p className="text-sm text-[var(--anc-muted-text)]">Este evento no tiene tandas.</p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {tiers.map((t) => (
            <TierReadCard key={t.id} tier={t} now={now} checkedIn={d.tierCheckedIn.get(t.id) ?? 0} />
          ))}
        </ul>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0">
          <SectionTitle>Descuentos</SectionTitle>
          <Card className="!p-0">
            {d.codes.length === 0 ? (
              <p className="p-4 text-sm text-[var(--anc-muted-text)]">Sin códigos de descuento.</p>
            ) : (
              <ul className="divide-y divide-white/10">
                {d.codes.map((c) => (
                  <li key={c.id} className="p-4 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="break-all font-mono font-semibold text-white">{c.code}</p>
                      <Badge tone={c.active ? "success" : "neutral"}>{c.active ? "Activo" : "Inactivo"}</Badge>
                    </div>
                    <p className="mt-1 text-neutral-300">
                      {c.kind === "percent" ? `${c.value}%` : clp(c.value)} · {int(c.used_count)}
                      {c.max_uses ? ` de ${int(c.max_uses)}` : ""} usos
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="min-w-0">
          <SectionTitle>Embajadores</SectionTitle>
          <Card className="!p-0">
            {d.ambassadors.length === 0 ? (
              <p className="p-4 text-sm text-[var(--anc-muted-text)]">Sin embajadores.</p>
            ) : (
              <ul className="divide-y divide-white/10">
                {d.ambassadors.map((a) => {
                  const s = byAmb.get(a.id);
                  return (
                    <li key={a.id} className="p-4 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 break-words font-semibold text-white">{a.name}</p>
                        <Badge tone={a.active ? "success" : "neutral"}>{a.active ? "Activo" : "Inactivo"}</Badge>
                      </div>
                      <p className="mt-0.5 break-all font-mono text-xs text-neutral-400">
                        {a.code}
                        {a.commission_percent !== null ? ` · ${a.commission_percent}%` : ""}
                      </p>
                      <p className="mt-1 text-neutral-300">
                        {int(s?.entradas ?? 0)} entradas · {clp(s?.ventaBase ?? 0)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="min-w-0">
          <SectionTitle>Staff de puerta</SectionTitle>
          <Card className="!p-0">
            {d.staff.length === 0 ? (
              <p className="p-4 text-sm text-[var(--anc-muted-text)]">Sin staff.</p>
            ) : (
              <ul className="divide-y divide-white/10">
                {d.staff.map((s) => (
                  <li key={s.id} className="p-4 text-sm">
                    <p className="break-all text-white">{s.email}</p>
                    <p className="text-xs text-neutral-400">{s.role}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
