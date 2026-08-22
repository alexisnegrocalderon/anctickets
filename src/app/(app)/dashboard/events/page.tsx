import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Event, Profile } from "@/lib/database.types";

const statusLabel: Record<Event["status"], string> = {
  draft: "Borrador",
  published: "Publicado",
  cancelled: "Cancelado",
};

const statusClass: Record<Event["status"], string> = {
  draft: "bg-neutral-100 text-neutral-600",
  published: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
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
        <h1 className="text-2xl font-bold text-neutral-900">Mis eventos</h1>
        <Link
          href="/dashboard/events/new"
          className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-700"
        >
          + Nuevo evento
        </Link>
      </div>

      {!profile?.mp_connected ? (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50 px-5 py-4">
          <div>
            <p className="font-semibold text-orange-800">
              Conecta tu cuenta de Mercado Pago
            </p>
            <p className="text-sm text-orange-700">
              Necesitas conectarla para poder recibir el dinero de tus ventas
              directo en tu cuenta.
            </p>
          </div>
          <Link
            href="/dashboard/mercadopago/connect"
            className="whitespace-nowrap rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-400"
          >
            Conectar Mercado Pago
          </Link>
        </div>
      ) : null}

      {!events || events.length === 0 ? (
        <p className="text-neutral-500">
          Todavía no has creado ningún evento.
        </p>
      ) : (
        <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/dashboard/events/${event.id}/edit`}
              className="flex items-center justify-between px-5 py-4 hover:bg-neutral-50"
            >
              <div>
                <p className="font-semibold text-neutral-900">{event.title}</p>
                <p className="text-sm text-neutral-500">
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
