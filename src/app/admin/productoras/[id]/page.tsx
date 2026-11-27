import { serverClock } from "@/lib/tiers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { getOrganizerDetail } from "@/lib/admin-data";
import { aggregateByEvent, aggregateOrders } from "@/lib/admin-stats";
import { clp, fechaChile, fechaHoraChile, haceCuanto, int } from "@/lib/admin-format";
import { Badge, Card } from "@/components/dashboard/ui";
import { EventStatusBadge, SectionTitle, StatTile, TierReadCard } from "@/components/admin/parts";
import SuspendControl from "@/components/admin/suspend-control";

export const dynamic = "force-dynamic";

const MP_WARN_DAYS = 30;

export default async function AdminOrganizerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const d = await getOrganizerDetail(id);
  if (!d) notFound();

  const now = serverClock();
  const { profile, summary, mp } = d;
  const name = profile.organizer_name ?? "Sin nombre";
  const totals = aggregateOrders(d.orders);
  const byEvent = aggregateByEvent(d.orders);
  const issued = [...d.tickets.values()].reduce((s, t) => s + t.issued, 0);
  const used = [...d.tickets.values()].reduce((s, t) => s + t.used, 0);

  const expiresTs = mp.expiresAt ? new Date(mp.expiresAt).getTime() : null;
  const mpExpired = expiresTs !== null && expiresTs < now;
  const mpSoon = expiresTs !== null && !mpExpired && expiresTs < now + MP_WARN_DAYS * 86_400_000;
  const mpDaysLeft = expiresTs !== null ? Math.ceil((expiresTs - now) / 86_400_000) : null;

  return (
    <div>
      <Link href="/admin/productoras" className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--anc-muted-text)] hover:text-white">
        ← Productoras
      </Link>

      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[clamp(1.9rem,7vw,2.75rem)] uppercase leading-none text-white [overflow-wrap:anywhere]">{name}</h2>
          <p className="mt-1.5 break-all text-sm text-[var(--anc-muted-text)]">{profile.email ?? "Sin correo"}</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <Badge tone={profile.mp_connected ? "success" : "neutral"}>{profile.mp_connected ? "MP conectada" : "Sin MP"}</Badge>
            {profile.suspended_at ? <Badge tone="danger">Suspendida</Badge> : <Badge tone="success">Activa</Badge>}
          </div>
        </div>
        <SuspendControl organizerId={profile.id} organizerName={name} suspended={!!profile.suspended_at} />
      </div>

      {profile.suspended_at ? (
        <section role="status" className="mt-5 rounded-2xl border border-red-500/40 bg-red-500/10 p-4">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[.18em] text-red-300">Suspendida</p>
          <p className="mt-1 text-sm text-white">
            Desde el {fechaHoraChile(profile.suspended_at)} ({haceCuanto(profile.suspended_at, now)}).
          </p>
          <p className="mt-1 break-words text-sm text-red-100/90">
            <span className="font-semibold">Motivo:</span> {profile.suspended_reason ?? "Sin motivo registrado"}
          </p>
        </section>
      ) : null}

      <SectionTitle>Ventas</SectionTitle>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Ventas (recibe ella)" value={clp(summary?.venta_base ?? totals.ventaBase)} sub={`${int(totals.ordenes)} órdenes aprobadas`} />
        <StatTile label="Comisión ANC" value={clp(summary?.comision_anc ?? totals.comisionAnc)} sub={`Cargo de servicio ${clp(totals.cargoServicio)}`} />
        <StatTile label="Entradas emitidas" value={int(summary?.entradas_emitidas ?? issued)} sub={`${int(summary?.entradas_ingresadas ?? used)} ingresaron`} />
        <StatTile label="Cortesías" value={int(totals.cortesias)} sub={`Descuentos dados ${clp(totals.descuentos)}`} />
      </div>

      <SectionTitle>Cuenta</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="text-xl uppercase text-white">Mercado Pago</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone={profile.mp_connected ? "success" : "neutral"}>{profile.mp_connected ? "Conectada" : "Sin conectar"}</Badge>
            {mpExpired ? <Badge tone="danger">Autorización vencida</Badge> : null}
            {mpSoon ? <Badge tone="danger">Vence pronto</Badge> : null}
          </div>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-[var(--anc-muted-text)]">Cuenta MP</dt>
            <dd className="break-all text-white">{mp.mpUserId ?? "—"}</dd>
            <dt className="text-[var(--anc-muted-text)]">Vigencia</dt>
            <dd className="text-white">
              {mp.expiresAt ? (
                <>
                  hasta el {fechaChile(mp.expiresAt)}
                  {mpDaysLeft !== null ? (
                    <span className="text-neutral-400">
                      {" "}
                      ({mpDaysLeft >= 0 ? `quedan ${mpDaysLeft} d` : `venció hace ${Math.abs(mpDaysLeft)} d`})
                    </span>
                  ) : null}
                </>
              ) : mp.linked ? (
                "sin fecha de vencimiento"
              ) : (
                "—"
              )}
            </dd>
          </dl>
        </Card>
        <Card>
          <h3 className="text-xl uppercase text-white">Datos</h3>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-[var(--anc-muted-text)]">Nombre de cuenta</dt>
            <dd className="break-words text-white">{profile.full_name ?? "—"}</dd>
            <dt className="text-[var(--anc-muted-text)]">Alta</dt>
            <dd className="text-white">{fechaChile(profile.created_at)}</dd>
            <dt className="text-[var(--anc-muted-text)]">Último acceso</dt>
            <dd className="text-white">{d.lastSignIn ? `${fechaHoraChile(d.lastSignIn)} (${haceCuanto(d.lastSignIn, now)})` : "—"}</dd>
            <dt className="text-[var(--anc-muted-text)]">Embajadores</dt>
            <dd className="text-white">{int(d.ambassadorCount)}</dd>
            <dt className="text-[var(--anc-muted-text)]">Códigos de descuento</dt>
            <dd className="text-white">{int(d.discountCodeCount)}</dd>
            <dt className="text-[var(--anc-muted-text)]">Staff de puerta</dt>
            <dd className="text-white">{int(d.staffCount)}</dd>
          </dl>
        </Card>
      </div>

      <SectionTitle aside={<span className="pb-1 text-sm text-[var(--anc-muted-text)]">{int(d.events.length)} en total</span>}>
        Eventos
      </SectionTitle>
      {d.events.length === 0 ? (
        <p className="rounded-2xl border border-[var(--anc-border)] bg-[var(--anc-surface)] p-5 text-sm text-[var(--anc-muted-text)]">
          Esta productora aún no crea eventos.
        </p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {d.events.map((ev) => {
            const t = byEvent.get(ev.id);
            const tk = d.tickets.get(ev.id);
            return (
              <li key={ev.id} className="min-w-0 rounded-2xl border border-[var(--anc-border)] bg-[var(--anc-surface)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-lg font-semibold text-white">{ev.title}</p>
                    <p className="text-sm text-[var(--anc-muted-text)]">{fechaHoraChile(ev.event_date)}</p>
                  </div>
                  <EventStatusBadge status={ev.status} />
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-[.14em] text-[var(--anc-muted-text)]">Ventas</dt>
                    <dd className="font-semibold text-white">{clp(t?.ventaBase ?? 0)}</dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-[.14em] text-[var(--anc-muted-text)]">Comisión</dt>
                    <dd className="font-semibold text-white">{clp(t?.comisionAnc ?? 0)}</dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-[.14em] text-[var(--anc-muted-text)]">Ingresos</dt>
                    <dd className="font-semibold text-white">
                      {int(tk?.used ?? 0)}/{int(tk?.issued ?? 0)}
                    </dd>
                  </div>
                </dl>
                {ev.tiers.length > 0 ? (
                  <ul className="mt-3 flex flex-col gap-2">
                    {ev.tiers
                      .slice()
                      .sort((a, b) => a.created_at.localeCompare(b.created_at))
                      .map((tier) => (
                        <TierReadCard key={tier.id} tier={tier} now={now} compact />
                      ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-neutral-400">Sin tandas.</p>
                )}
                <Link
                  href={`/admin/eventos/${ev.id}`}
                  className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--anc-accent-light)] hover:underline"
                >
                  Ver como la productora (solo lectura) →
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <SectionTitle>Auditoría</SectionTitle>
      {d.audit.length === 0 ? (
        <p className="text-sm text-[var(--anc-muted-text)]">Sin cambios de estado registrados.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-white/10 rounded-2xl border border-[var(--anc-border)] bg-[var(--anc-surface)] px-4">
          {d.audit.map((a) => {
            const reason = (a.detail as { reason?: string; previous_reason?: string | null }).reason;
            return (
              <li key={a.id} className="py-3 text-sm">
                <p className="text-white">
                  {a.action === "organizer.suspend" ? "Suspendida" : a.action === "organizer.reactivate" ? "Reactivada" : a.action}
                  <span className="text-[var(--anc-muted-text)]"> · {fechaHoraChile(a.created_at)}</span>
                </p>
                <p className="break-all text-xs text-[var(--anc-muted-text)]">por {a.admin_email}</p>
                {reason ? <p className="mt-0.5 break-words text-neutral-300">Motivo: {reason}</p> : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
