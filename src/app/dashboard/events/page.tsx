import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Event, Profile } from "@/lib/database.types";
import { Badge, LinkButton, PageHeader } from "@/components/dashboard/ui";
import CopyEventLinkButton from "@/components/dashboard/copy-event-link-button";

const statusLabel: Record<Event["status"], string> = {
  draft: "Borrador",
  published: "Publicado",
  cancelled: "Cancelado",
};

const statusTone: Record<Event["status"], "neutral" | "success" | "danger"> = {
  draft: "neutral",
  published: "success",
  cancelled: "danger",
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
      <PageHeader
        title="Mis eventos"
        actions={<LinkButton variant="primary" href="/dashboard/events/new">+ Nuevo evento</LinkButton>}
      />

      {!profile?.mp_connected ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#a77fff]/30 bg-[#a77fff]/10 px-5 py-4">
          <div>
            <p className="font-semibold text-[#c3adff]">
              Conecta tu cuenta de Mercado Pago
            </p>
            <p className="text-sm text-neutral-300">
              Necesitas conectarla para poder recibir el dinero de tus ventas
              directo en tu cuenta.
            </p>
          </div>
          <LinkButton variant="primary" href="/dashboard/mercadopago/connect">
            Conectar Mercado Pago
          </LinkButton>
        </div>
      ) : null}

      {!events || events.length === 0 ? (
        <p className="text-neutral-400">
          Todavía no has creado ningún evento.
        </p>
      ) : (
        <div className="divide-y divide-white/10 rounded-xl border border-white/10 bg-[#101010]">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
            >
              <Link
                href={`/dashboard/events/${event.id}/edit`}
                className="min-w-0 flex-1 transition hover:opacity-80"
              >
                <p className="truncate font-semibold text-[#f5f4f1]">{event.title}</p>
                <p className="text-sm text-neutral-400">
                  {new Date(event.event_date).toLocaleString("es-CL")}
                  {event.venue ? ` · ${event.venue}` : ""}
                </p>
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={statusTone[event.status]}>{statusLabel[event.status]}</Badge>
                <CopyEventLinkButton slug={event.slug} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
