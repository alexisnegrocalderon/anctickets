import { serverClock } from "@/lib/tiers";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { getCronRow, getHealthRows, getOrganizerRows, getSalesRows } from "@/lib/admin-data";
import { buildSeries, cronStatus, evaluateHealth, isActiveOrganizer, summarizeSales } from "@/lib/admin-stats";
import { clp, int } from "@/lib/admin-format";
import { Card } from "@/components/dashboard/ui";
import { SalesBars, SectionTitle, StatTile } from "@/components/admin/parts";

export const dynamic = "force-dynamic";

export default async function AdminSummaryPage() {
  await requireAdmin();
  const now = serverClock();
  const [sales, orgs, health, cron] = await Promise.all([getSalesRows(), getOrganizerRows(), getHealthRows(), getCronRow()]);

  const summary = summarizeSales(sales.data, now);
  const series = buildSeries(sales.data, 30, now);
  const active = orgs.data.filter(isActiveOrganizer).length;
  const withMp = orgs.data.filter((o) => o.mp_connected).length;
  const suspended = orgs.data.filter((o) => o.suspended_at).length;

  const alerts = evaluateHealth(health.data).filter((h) => h.alerta);
  const cronState = cronStatus(cron.data, now);
  const attention = [
    ...(cronState.alerta ? [{ clave: "cron", titulo: "Tarea diaria", detalle: cronState.ranAt ? "No corre hace más de 36 horas" : "Sin registro de ejecución" }] : []),
    ...alerts.map((a) => ({ clave: a.clave, titulo: a.titulo, detalle: `${int(a.cantidad)} ${a.cantidad === 1 ? "caso" : "casos"}` })),
  ];
  const loadError = sales.error ?? orgs.error ?? health.error;

  const periods = [
    { label: "Hoy", t: summary.today },
    { label: "Últimos 7 días", t: summary.last7 },
    { label: "Últimos 30 días", t: summary.last30 },
    { label: "Total", t: summary.all },
  ];

  return (
    <div>
      <h2 className="text-3xl uppercase leading-none text-white">Resumen</h2>
      <p className="mt-1.5 text-sm text-[var(--anc-muted-text)]">
        Ventas cobradas a compradores y comisión que le queda a ANC (después de Mercado Pago). Hora de Chile.
      </p>

      {loadError ? (
        <p role="alert" className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {loadError} Revisa que la migración 0010 esté aplicada.
        </p>
      ) : null}

      <section aria-labelledby="atencion" className="mt-5">
        <Card className={attention.length > 0 ? "border-red-500/40" : ""}>
          <div className="flex items-center justify-between gap-3">
            <h3 id="atencion" className="text-2xl uppercase text-white">
              Atención
            </h3>
            <Link href="/admin/salud" className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--anc-accent-light)] hover:underline">
              Ver salud →
            </Link>
          </div>
          {attention.length === 0 ? (
            <p className="mt-1 flex items-center gap-2 text-sm text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
              Todo en orden: ningún indicador en alerta.
            </p>
          ) : (
            <ul className="mt-2 flex flex-col divide-y divide-white/10">
              {attention.map((a) => (
                <li key={a.clave}>
                  <Link href="/admin/salud" className="flex min-h-11 items-center justify-between gap-3 py-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2 text-white">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-red-400" aria-hidden="true" />
                      <span className="min-w-0 break-words">{a.titulo}</span>
                    </span>
                    <span className="shrink-0 font-semibold text-red-300">{a.detalle}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <SectionTitle>Ventas y comisión</SectionTitle>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {periods.map(({ label, t }) => (
          <StatTile
            key={label}
            label={label}
            value={clp(t.total)}
            sub={
              <>
                Comisión ANC <strong className="font-semibold text-white">{clp(t.comision)}</strong>
                <br />
                {int(t.entradas)} {t.entradas === 1 ? "entrada" : "entradas"}
              </>
            }
          />
        ))}
      </div>

      <SectionTitle>Plataforma</SectionTitle>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Entradas vendidas" value={int(summary.all.entradas)} sub={`${int(summary.all.ordenes)} órdenes pagadas`} />
        <StatTile label="Productoras activas" value={int(active)} sub={`${int(orgs.data.length)} en total`} />
        <StatTile label="Con Mercado Pago" value={int(withMp)} sub="cuenta conectada" />
        <StatTile label="Suspendidas" value={int(suspended)} sub={suspended > 0 ? "sin ventas nuevas" : "ninguna"} />
      </div>

      <SectionTitle>Últimos 30 días</SectionTitle>
      <Card>
        <SalesBars points={series} />
      </Card>
    </div>
  );
}
