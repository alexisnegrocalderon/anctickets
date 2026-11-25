import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Event, Profile } from "@/lib/database.types";
import { LinkButton, PageHeader } from "@/components/dashboard/ui";
import CopyEventLinkButton from "@/components/dashboard/copy-event-link-button";
import { resolveEventTheme } from "@/lib/event-themes";

const statusLabel: Record<Event["status"], string> = {
  draft: "Borrador",
  published: "Publicado",
  cancelled: "Cancelado",
};

const statusClass: Record<Event["status"], string> = {
  draft: "bg-black/65 text-white",
  published: "bg-emerald-400 text-[#06281b]",
  cancelled: "bg-red-500 text-white",
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
      {!profile?.mp_connected ? (
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-[var(--anc-vermilion)]/40 bg-[var(--anc-vermilion)]/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <p className="font-semibold text-white">Conecta tu cuenta de Mercado Pago</p>
            <p className="mt-0.5 text-sm text-[var(--anc-muted-text)]">
              Necesitas conectarla para recibir el dinero de tus ventas directo en tu cuenta. No bloquea
              nada: puedes seguir armando tus eventos.
            </p>
          </div>
          <LinkButton variant="primary" href="/dashboard/mercadopago/connect" className="shrink-0">
            Conectar Mercado Pago
          </LinkButton>
        </div>
      ) : null}

      <PageHeader
        title="Mis eventos"
        actions={
          <LinkButton variant="primary" href="/dashboard/events/new">
            + Nuevo evento
          </LinkButton>
        }
      />

      {!events || events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/20 px-6 py-14 text-center">
          <p className="font-display text-3xl uppercase text-white">Aún no hay eventos</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--anc-muted-text)]">
            Crea el primero en unos minutos y comparte el link para empezar a vender.
          </p>
          <LinkButton variant="primary" href="/dashboard/events/new" className="mt-6">
            + Nuevo evento
          </LinkButton>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => {
            const theme = resolveEventTheme(event.theme, event.accent_color);
            return (
              <li
                key={event.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--anc-border)] bg-[var(--anc-surface)] transition-transform duration-300 [transition-timing-function:var(--ease-out)] hover:-translate-y-0.5"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--anc-surface-2)]">
                  {event.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={event.image_url}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 [transition-timing-function:var(--ease-out)] group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-end p-4"
                      style={{ backgroundImage: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}
                    >
                      <p
                        className="font-display line-clamp-3 text-3xl uppercase leading-[.98]"
                        style={{ color: theme.ink }}
                      >
                        {event.title}
                      </p>
                    </div>
                  )}
                  <span
                    className={`absolute left-3 top-3 rounded-full px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[.1em] backdrop-blur ${statusClass[event.status]}`}
                  >
                    {statusLabel[event.status]}
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/events/${event.id}/edit`}
                      className="block truncate text-lg font-bold text-white after:absolute after:inset-0 after:content-['']"
                    >
                      {event.title}
                    </Link>
                    <p className="mt-0.5 truncate text-sm text-[var(--anc-muted-text)]">
                      {new Date(event.event_date).toLocaleString("es-CL", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {event.venue ? ` · ${event.venue}` : ""}
                    </p>
                  </div>
                  <div className="relative z-10 mt-auto">
                    <CopyEventLinkButton slug={event.slug} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
