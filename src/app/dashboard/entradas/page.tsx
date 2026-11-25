import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getClaimsUser, getSupabase } from "@/lib/auth";
import { EntradasListSkeleton } from "@/components/dashboard/skeletons";
import type { Event, TicketType } from "@/lib/database.types";
import { LinkButton, PageHeader } from "@/components/dashboard/ui";

export const metadata: Metadata = { title: "Entradas — ANC Tickets" };

const PAGE_SIZE = 1000;

type OrderRow = { event_id: string; order_items: { quantity: number; unit_base_price: number | string }[] };
type EventRow = Pick<Event, "id" | "title" | "event_date" | "status">;
type TypeRow = Pick<TicketType, "event_id" | "quantity" | "sold_count" | "reserved_count">;

const clp = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`;
const statusLabel: Record<Event["status"], string> = { draft: "Borrador", published: "Publicado", cancelled: "Cancelado" };

function dateText(iso: string) {
  return new Date(iso).toLocaleString("es-CL", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function EntradasPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const active = tab === "escaner" ? "escaner" : "ventas";

  // Cabecera y pestañas salen de inmediato; la lista (consultas a la base)
  // llega por streaming dentro del Suspense.
  return (
    <div>
      <PageHeader title="Entradas" subtitle="Ventas de tus eventos y control de acceso en puerta." />

      <nav aria-label="Secciones de entradas" className="mb-6 grid grid-cols-2 gap-1 rounded-full border border-[var(--anc-border)] bg-[var(--anc-surface)] p-1">
        {(
          [
            ["ventas", "Ventas"],
            ["escaner", "Escáner"],
          ] as const
        ).map(([id, label]) => (
          <Link
            key={id}
            href={id === "ventas" ? "/dashboard/entradas" : "/dashboard/entradas?tab=escaner"}
            aria-current={active === id ? "page" : undefined}
            className={`flex min-h-11 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
              active === id ? "bg-[var(--anc-vermilion)] text-[var(--anc-ink)]" : "text-[var(--anc-muted-text)] hover:text-white"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      <Suspense key={active} fallback={<EntradasListSkeleton />}>
        <EntradasList active={active} />
      </Suspense>
    </div>
  );
}

async function EntradasList({ active }: { active: "ventas" | "escaner" }) {
  const user = await getClaimsUser();
  if (!user) redirect("/login?next=/dashboard/entradas");

  const supabase = await getSupabase();

  const { data: eventsData } = await supabase
    .from("events")
    .select("id, title, event_date, status")
    .eq("organizer_id", user.id)
    .order("event_date", { ascending: false })
    .returns<EventRow[]>();
  const events = eventsData ?? [];
  const ids = events.map((e) => e.id);

  const sold = new Map<string, { sold: number; reserved: number; total: number }>();
  const revenue = new Map<string, number>();

  if (active === "ventas" && ids.length > 0) {
    // Cupos y recaudación dependen solo de los ids de eventos: en paralelo.
    const typesQuery = supabase
      .from("ticket_types")
      .select("event_id, quantity, sold_count, reserved_count")
      .in("event_id", ids)
      .returns<TypeRow[]>();

    // Mismo cálculo que la pestaña Ventas de la edición: lo que recibe el productor (precio base, sin cargo de servicio).
    const revenueTask = (async () => {
      for (let from = 0; ; from += PAGE_SIZE) {
        const { data } = await supabase
          .from("orders")
          .select("event_id, order_items(quantity, unit_base_price)")
          .in("event_id", ids)
          .eq("status", "approved")
          .order("created_at", { ascending: true })
          .range(from, from + PAGE_SIZE - 1)
          .returns<OrderRow[]>();
        for (const order of data ?? []) {
          const base = order.order_items.reduce((s, i) => s + i.quantity * Number(i.unit_base_price), 0);
          revenue.set(order.event_id, (revenue.get(order.event_id) ?? 0) + base);
        }
        if (!data || data.length < PAGE_SIZE) break;
      }
    })();

    const [{ data: types }] = await Promise.all([typesQuery, revenueTask]);
    for (const t of types ?? []) {
      const acc = sold.get(t.event_id) ?? { sold: 0, reserved: 0, total: 0 };
      acc.sold += t.sold_count;
      acc.reserved += t.reserved_count;
      acc.total += t.quantity;
      sold.set(t.event_id, acc);
    }
  }

  const published = events.filter((e) => e.status === "published");
  const list = active === "ventas" ? events : published;

  return (
    <>
      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/20 px-6 py-14 text-center">
          <p className="font-display text-3xl uppercase text-white">
            {active === "ventas" ? "Aún no hay eventos" : "No hay eventos publicados"}
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--anc-muted-text)]">
            {active === "ventas"
              ? "Crea tu primer evento para empezar a vender entradas."
              : "Publica un evento para escanear las entradas en la puerta."}
          </p>
          <LinkButton variant="primary" href="/dashboard/events/new" className="mt-6">
            Nuevo evento
          </LinkButton>
        </div>
      ) : active === "ventas" ? (
        <ul className="flex flex-col gap-3">
          {events.map((event) => {
            const s = sold.get(event.id) ?? { sold: 0, reserved: 0, total: 0 };
            const available = Math.max(s.total - s.sold - s.reserved, 0);
            return (
              <li key={event.id} className="rounded-2xl border border-[var(--anc-border)] bg-[var(--anc-surface)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-white">{event.title}</p>
                    <p className="mt-0.5 truncate text-sm text-[var(--anc-muted-text)]">{dateText(event.event_date)}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-neutral-200">
                    {statusLabel[event.status]}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-3">
                  <div>
                    <dt className="text-xs text-[var(--anc-muted-text)]">Vendidas</dt>
                    <dd className="mt-0.5 text-lg font-bold text-white">{s.sold}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--anc-muted-text)]">Disponibles</dt>
                    <dd className="mt-0.5 text-lg font-bold text-white">{available}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-[var(--anc-muted-text)]">Recibes</dt>
                    <dd className="mt-0.5 truncate text-lg font-bold text-[var(--anc-vermilion)]">{clp(revenue.get(event.id) ?? 0)}</dd>
                  </div>
                </dl>
                <LinkButton href={`/dashboard/events/${event.id}/edit?tab=ventas`} className="mt-4 w-full">
                  Ver detalle y editar
                </LinkButton>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="flex flex-col gap-3">
          {published.map((event) => (
            <li key={event.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--anc-border)] bg-[var(--anc-surface)] p-4">
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-white">{event.title}</p>
                <p className="mt-0.5 truncate text-sm text-[var(--anc-muted-text)]">{dateText(event.event_date)}</p>
              </div>
              <LinkButton variant="primary" href={`/scan/${event.id}`} className="shrink-0">
                Abrir escáner
              </LinkButton>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
