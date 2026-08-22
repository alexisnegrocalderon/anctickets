import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Event, Profile } from "@/lib/database.types";

const statusLabel: Record<Event["status"], string> = {
  draft: "Borrador",
  published: "Publicado",
  cancelled: "Cancelado",
};

const statusClass: Record<Event["status"], string> = {
  draft: "bg-white/10 text-neutral-300",
  published: "bg-emerald-500/15 text-emerald-300",
  cancelled: "bg-red-500/15 text-red-300",
};

export default async function DashboardEventsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single<Profile>();

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("organizer_id", user!.id)
    .order("created_at", { ascending: false })
    .returns<Event[]>();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-[#f5f4f1]">
          Mis eventos
        </h1>
        <Link
          href="/dashboard/events/new"
          className="rounded-full bg-[#a77fff] px-5 py-2 text-sm font-semibold text-[#120d1b] transition hover:bg-[#c3adff]"
        >
          + Nuevo evento
        </Link>
      </div>

      {!profile?.mp_connected ? (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-[#a77fff]/30 bg-[#a77fff]/10 px-5 py-4">
          <div>
            <p className="font-semibold text-[#c3adff]">
              Conecta tu cuenta de Mercado Pago
            </p>
            <p className="text-sm text-neutral-300">
              Necesitas conectarla para poder recibir el dinero de tus ventas
              directo en tu cuenta.
            </p>
          </div>
          <Link
            href="/dashboard/mercadopago/connect"
            className="whitespace-nowrap rounded-full bg-[#a77fff] px-4 py-2 text-sm font-semibold text-[#120d1b] transition hover:bg-[#c3adff]"
          >
            Conectar Mercado Pago
          </Link>
        </div>
      ) : null}

      {!events || events.length === 0 ? (
        <p className="text-neutral-400">
          Todavía no has creado ningún evento.
        </p>
      ) : (
        <div className="divide-y divide-white/10 rounded-xl border border-white/10 bg-[#101010]">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/dashboard/events/${event.id}/edit`}
              className="flex items-center justify-between px-5 py-4 transition hover:bg-white/5"
            >
              <div>
                <p className="font-semibold text-[#f5f4f1]">{event.title}</p>
                <p className="text-sm text-neutral-400">
                  {new Date(event.event_date).toLocaleString("es-CL")}
                  {event.venue ? ` · ${event.venue}` : ""}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass[event.status]}`}
              >
                {statusLabel[event.status]}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
