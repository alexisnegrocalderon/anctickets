import { serverClock } from "@/lib/tiers";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { getCronRow, getHealthRows } from "@/lib/admin-data";
import { CRON_MAX_AGE_HOURS, cronStatus, evaluateHealth } from "@/lib/admin-stats";
import { fechaHoraChile, haceCuanto, int } from "@/lib/admin-format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Salud — Administración ANC", robots: { index: false, follow: false } };

function Light({ alert }: { alert: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        alert ? "bg-red-500/15 text-red-300" : "bg-emerald-500/15 text-emerald-300"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${alert ? "bg-red-400" : "bg-emerald-400"}`} aria-hidden="true" />
      {alert ? "Alerta" : "OK"}
    </span>
  );
}

export default async function AdminHealthPage() {
  await requireAdmin();
  const now = serverClock();
  const [health, cron] = await Promise.all([getHealthRows(), getCronRow()]);
  const items = evaluateHealth(health.data);
  const cronState = cronStatus(cron.data, now);
  const alerts = items.filter((i) => i.alerta).length + (cronState.alerta ? 1 : 0);

  return (
    <div>
      <h2 className="text-3xl uppercase leading-none text-white">Salud del sistema</h2>
      <p className="mt-1.5 text-sm text-[var(--anc-muted-text)]">
        {alerts === 0 ? "Todo en orden." : `${alerts} ${alerts === 1 ? "indicador en alerta" : "indicadores en alerta"}.`} Se calcula al abrir
        esta pantalla.
      </p>

      {health.error || cron.error ? (
        <p role="alert" className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {health.error ?? cron.error} Revisa que la migración 0010 esté aplicada.
        </p>
      ) : null}

      <ul className="mt-5 grid gap-3 lg:grid-cols-2">
        <li className={`rounded-2xl border bg-[var(--anc-surface)] p-4 ${cronState.alerta ? "border-red-500/40" : "border-[var(--anc-border)]"}`}>
          <div className="flex items-start justify-between gap-3">
            <h3 className="min-w-0 text-xl uppercase text-white">Tarea diaria</h3>
            <Light alert={cronState.alerta} />
          </div>
          <p className="mt-1 text-sm text-[var(--anc-muted-text)]">
            Libera reservas vencidas y mantiene viva la base. Debe correr cada día; se alerta pasadas {CRON_MAX_AGE_HOURS} horas.
          </p>
          <p className="mt-2 text-sm text-white">
            {cronState.ranAt ? (
              <>
                Última ejecución: {fechaHoraChile(cronState.ranAt)} ({haceCuanto(cronState.ranAt, now)})
                {cronState.expiredOrders !== null ? `, expiró ${int(cronState.expiredOrders)} ${cronState.expiredOrders === 1 ? "orden" : "órdenes"}` : ""}.
              </>
            ) : (
              "Sin registro de ejecución."
            )}
          </p>
        </li>

        {items.map((i) => (
          <li key={i.clave} className={`rounded-2xl border bg-[var(--anc-surface)] p-4 ${i.alerta ? "border-red-500/40" : "border-[var(--anc-border)]"}`}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="min-w-0 text-xl uppercase text-white">{i.titulo}</h3>
              <Light alert={i.alerta} />
            </div>
            <p className="mt-1 text-sm text-[var(--anc-muted-text)]">{i.significado}</p>
            <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-sm">
              <span className={`font-display text-3xl leading-none ${i.alerta ? "text-red-300" : "text-white"}`}>{int(i.cantidad)}</span>
              <span className="text-neutral-300">{i.cantidad === 1 ? "caso" : "casos"}</span>
              {i.detalle ? <span className="break-words text-xs text-neutral-400">{i.detalle}</span> : null}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
