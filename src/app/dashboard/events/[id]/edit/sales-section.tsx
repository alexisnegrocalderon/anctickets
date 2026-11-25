import { Card } from "@/components/dashboard/ui";
import ResendEmailButton from "@/app/(app)/mis-entradas/resend-button";

export interface SalesData {
  ticketsSold: number;
  ticketsTotal: number;
  /** Suma del valor base de las entradas ya con descuentos: lo que recibe el productor. */
  revenueBase: number;
  /** Cargo de servicio que pagaron los compradores (no es del productor). */
  serviceFeesPaid: number;
  discountsGiven: number;
  courtesyTickets: number;
  checkedIn: number;
  issued: number;
  /** Órdenes aprobadas cuyo correo con las entradas no salió (falló el envío). */
  unsentEmails: { id: string; email: string }[];
  perType: { id: string; name: string; sold: number; reserved: number; quantity: number; checkedIn: number }[];
}

const clp = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`;

export default function SalesSection({ eventId, data }: { eventId: string; data: SalesData }) {
  return (
    <Card className="mb-6">
      <h2 className="mb-4 text-2xl uppercase text-white">Ventas</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <p className="text-2xl font-bold text-[var(--anc-accent)]">{clp(data.revenueBase)}</p>
          <p className="text-sm text-neutral-300">Venta de entradas (lo que recibes)</p>
          <p className="text-xs text-neutral-500">Valor de las entradas ya con descuentos, sin el cargo de servicio.</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-[#f5f4f1]">
            {data.ticketsSold}
            <span className="text-base font-normal text-neutral-500">/{data.ticketsTotal}</span>
          </p>
          <p className="text-sm text-neutral-300">Entradas vendidas</p>
          {data.courtesyTickets > 0 ? (
            <p className="text-xs text-neutral-500">Incluye {data.courtesyTickets} de cortesía</p>
          ) : null}
        </div>
        <div>
          <p className="text-2xl font-bold text-[#f5f4f1]">
            {data.checkedIn}
            <span className="text-base font-normal text-neutral-500">/{data.issued}</span>
          </p>
          <p className="text-sm text-neutral-300">Ya ingresaron</p>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-1 gap-2 border-t border-white/10 pt-4 text-sm sm:grid-cols-2">
        <div className="flex justify-between gap-3">
          <dt className="text-neutral-400">Cargo de servicio pagado por compradores</dt>
          <dd className="text-[#f5f4f1]">{clp(data.serviceFeesPaid)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-neutral-400">Descuentos otorgados</dt>
          <dd className="text-[#f5f4f1]">{clp(data.discountsGiven)}</dd>
        </div>
      </dl>

      {data.perType.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-wide text-neutral-400">
              <tr>
                <th className="px-3 py-2">Entrada</th>
                <th className="px-3 py-2 text-right">Vendidas</th>
                <th className="px-3 py-2 text-right">Reservadas</th>
                <th className="px-3 py-2 text-right">Ingresaron</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {data.perType.map((t) => (
                <tr key={t.id}>
                  <td className="px-3 py-2 text-[#f5f4f1]">{t.name}</td>
                  <td className="px-3 py-2 text-right">
                    {t.sold}
                    <span className="text-neutral-500">/{t.quantity}</span>
                  </td>
                  <td className="px-3 py-2 text-right">{t.reserved}</td>
                  <td className="px-3 py-2 text-right">{t.checkedIn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {data.unsentEmails.length > 0 ? (
        <div className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="mb-3 text-sm font-semibold text-amber-300">
            {data.unsentEmails.length === 1 ? "1 compra" : `${data.unsentEmails.length} compras`} sin correo enviado
          </p>
          <ul className="flex flex-col gap-3">
            {data.unsentEmails.slice(0, 20).map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3">
                <span className="min-w-0 truncate text-sm text-neutral-200">{o.email}</span>
                <ResendEmailButton orderId={o.id} label="Reenviar correo" />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-5">
        <a
          href={`/api/dashboard/events/${eventId}/export`}
          className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-[#f5f4f1] transition hover:border-[var(--anc-accent-light)] hover:text-[var(--anc-accent-light)]"
        >
          Exportar asistentes (CSV)
        </a>
      </div>
    </Card>
  );
}
