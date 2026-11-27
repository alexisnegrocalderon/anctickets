import { serverClock } from "@/lib/tiers";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { getLastSignIns, getOrganizerRows } from "@/lib/admin-data";
import {
  filterOrganizers,
  ORGANIZER_FILTERS,
  ORGANIZER_ORDERS,
  parseOrganizerQuery,
  sortOrganizers,
  type OrganizerFilter,
  type OrganizerOrder,
} from "@/lib/admin-stats";
import { clp, fechaChile, haceCuanto, int } from "@/lib/admin-format";
import type { AdminOrganizerRow } from "@/lib/database.types";
import { Badge } from "@/components/dashboard/ui";

export const dynamic = "force-dynamic";

const LIMIT = 200;

function href(q: string, f: OrganizerFilter, o: OrganizerOrder) {
  const p = new URLSearchParams();
  if (q) p.set("q", q);
  if (f !== "all") p.set("f", f);
  if (o !== "sales") p.set("o", o);
  const s = p.toString();
  return s ? `/admin/productoras?${s}` : "/admin/productoras";
}

function Chip({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={to}
      aria-current={active ? "true" : undefined}
      className={`inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-semibold transition ${
        active ? "border-white bg-white text-[var(--anc-ink)]" : "border-white/20 text-white hover:border-white/50"
      }`}
    >
      {children}
    </Link>
  );
}

function Badges({ o }: { o: AdminOrganizerRow }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge tone={o.mp_connected ? "success" : "neutral"}>{o.mp_connected ? "MP conectada" : "Sin MP"}</Badge>
      {o.suspended_at ? <Badge tone="danger">Suspendida</Badge> : null}
    </div>
  );
}

export default async function AdminOrganizersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; f?: string | string[]; o?: string | string[] }>;
}) {
  await requireAdmin();
  const { q, filter, order } = parseOrganizerQuery(await searchParams);
  const [orgs, signIns] = await Promise.all([getOrganizerRows(), getLastSignIns()]);
  const now = serverClock();

  const all = orgs.data;
  const rows = sortOrganizers(filterOrganizers(all, q, filter), order);
  const shown = rows.slice(0, LIMIT);
  const access = (id: string) => {
    const iso = signIns.get(id);
    return iso ? haceCuanto(iso, now) : "—";
  };

  return (
    <div>
      <h2 className="text-3xl uppercase leading-none text-white">Productoras</h2>
      <p className="mt-1.5 text-sm text-[var(--anc-muted-text)]">
        {int(rows.length)} de {int(all.length)} {all.length === 1 ? "productora" : "productoras"}. Ventas = lo que recibe la
        productora; comisión = lo que le queda a ANC.
      </p>

      {orgs.error ? (
        <p role="alert" className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {orgs.error} Revisa que la migración 0010 esté aplicada.
        </p>
      ) : null}

      <form action="/admin/productoras" method="get" role="search" className="mt-5 flex gap-2">
        {filter !== "all" ? <input type="hidden" name="f" value={filter} /> : null}
        {order !== "sales" ? <input type="hidden" name="o" value={order} /> : null}
        <input
          type="search"
          name="q"
          defaultValue={q}
          maxLength={80}
          placeholder="Buscar por nombre o correo"
          aria-label="Buscar por nombre o correo"
          autoComplete="off"
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/15 bg-transparent px-3.5 py-2 text-base text-white placeholder:text-neutral-500 transition focus:border-[var(--anc-accent)] focus:outline-none sm:text-sm"
        />
        <button
          type="submit"
          className="min-h-11 shrink-0 rounded-full border border-white/20 px-5 text-sm font-semibold text-white transition hover:border-[var(--anc-accent-light)] hover:text-[var(--anc-accent-light)]"
        >
          Buscar
        </button>
      </form>

      <div className="-mx-4 mt-3 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-2" role="group" aria-label="Filtrar por estado">
          {ORGANIZER_FILTERS.map((f) => (
            <Chip key={f.value} to={href(q, f.value, order)} active={filter === f.value}>
              {f.label}
            </Chip>
          ))}
        </div>
      </div>
      <div className="-mx-4 mt-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
        <div className="flex items-center gap-2" role="group" aria-label="Ordenar">
          <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-[.16em] text-[var(--anc-muted-text)]">Orden</span>
          {ORGANIZER_ORDERS.map((o) => (
            <Chip key={o.value} to={href(q, filter, o.value)} active={order === o.value}>
              {o.label}
            </Chip>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-[var(--anc-border)] bg-[var(--anc-surface)] p-6 text-center text-sm text-[var(--anc-muted-text)]">
          {all.length === 0 ? "Aún no hay productoras." : "Ninguna productora coincide con la búsqueda."}
        </p>
      ) : (
        <>
          {/* Celular: tarjetas */}
          <ul className="mt-5 flex flex-col gap-3 md:hidden">
            {shown.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/admin/productoras/${o.id}`}
                  className="block rounded-2xl border border-[var(--anc-border)] bg-[var(--anc-surface)] p-4 transition active:scale-[.99]"
                >
                  <p className="break-words text-lg font-semibold text-white">{o.organizer_name ?? "Sin nombre"}</p>
                  <p className="mt-0.5 break-all text-sm text-[var(--anc-muted-text)]">{o.email ?? "Sin correo"}</p>
                  <div className="mt-2.5">
                    <Badges o={o} />
                  </div>
                  <dl className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/10 pt-3.5 text-sm">
                    <div>
                      <dt className="font-mono text-[10px] uppercase tracking-[.14em] text-[var(--anc-muted-text)]">Eventos</dt>
                      <dd className="text-white">
                        {int(o.eventos_total)} <span className="text-neutral-400">({int(o.eventos_publicados)} publ.)</span>
                      </dd>
                    </div>
                    <div>
                      <dt className="font-mono text-[10px] uppercase tracking-[.14em] text-[var(--anc-muted-text)]">Último acceso</dt>
                      <dd className="text-white">{access(o.id)}</dd>
                    </div>
                    <div>
                      <dt className="font-mono text-[10px] uppercase tracking-[.14em] text-[var(--anc-muted-text)]">Ventas</dt>
                      <dd className="font-semibold text-white">{clp(o.venta_base)}</dd>
                    </div>
                    <div>
                      <dt className="font-mono text-[10px] uppercase tracking-[.14em] text-[var(--anc-muted-text)]">Comisión ANC</dt>
                      <dd className="font-semibold text-white">{clp(o.comision_anc)}</dd>
                    </div>
                  </dl>
                </Link>
              </li>
            ))}
          </ul>

          {/* Escritorio: tabla */}
          <div className="mt-5 hidden overflow-hidden rounded-2xl border border-[var(--anc-border)] bg-[var(--anc-surface)] md:block">
            <table className="w-full table-fixed text-left text-sm">
              <caption className="sr-only">Productoras</caption>
              <thead className="border-b border-white/10 font-mono text-[10px] uppercase tracking-[.14em] text-[var(--anc-muted-text)]">
                <tr>
                  <th scope="col" className="w-[34%] px-4 py-3 font-bold">Productora</th>
                  <th scope="col" className="w-[17%] px-3 py-3 font-bold">Estado</th>
                  <th scope="col" className="w-[9%] px-3 py-3 text-right font-bold">Eventos</th>
                  <th scope="col" className="w-[13%] px-3 py-3 text-right font-bold">Ventas</th>
                  <th scope="col" className="w-[13%] px-3 py-3 text-right font-bold">Comisión ANC</th>
                  <th scope="col" className="w-[14%] px-4 py-3 text-right font-bold">Último acceso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {shown.map((o) => (
                  <tr key={o.id} className="transition hover:bg-white/[.03]">
                    <td className="px-4 py-3">
                      <Link href={`/admin/productoras/${o.id}`} className="block min-h-11 py-0.5">
                        <span className="block break-words font-semibold text-white">{o.organizer_name ?? "Sin nombre"}</span>
                        <span className="block break-all text-xs text-[var(--anc-muted-text)]">{o.email ?? "Sin correo"}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <Badges o={o} />
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-white">
                      {int(o.eventos_total)}
                      <span className="block text-xs text-neutral-400">{int(o.eventos_publicados)} publ.</span>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums text-white">{clp(o.venta_base)}</td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums text-white">{clp(o.comision_anc)}</td>
                    <td className="px-4 py-3 text-right text-white">
                      {access(o.id)}
                      <span className="block text-xs text-neutral-400">alta {fechaChile(o.created_at)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > shown.length ? (
            <p className="mt-3 text-center text-xs text-[var(--anc-muted-text)]">
              Mostrando las primeras {LIMIT}. Afina la búsqueda para ver el resto.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
