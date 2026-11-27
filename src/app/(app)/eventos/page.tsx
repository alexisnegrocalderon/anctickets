/**
 * /eventos — versión mínima de la Cartelera mientras se construye la pared
 * vertical (Paquete 2): lista de eventos publicados con fecha futura, datos
 * reales de la base. Si no hay ninguno, "Nada por ahora".
 */
import type { Metadata } from "next";
import Link from "next/link";
import ProducerLink from "@/components/doors/producer-link";
import { createClient } from "@/lib/supabase/server";
import type { Event } from "@/lib/database.types";

export const metadata: Metadata = {
  title: "Próximos eventos — ANC Tickets",
  description: "Los próximos eventos publicados en ANC Tickets. Compra tus entradas desde el celular.",
  alternates: { canonical: "/eventos" },
};

const dateFmt = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function EventosPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("id, title, slug, venue, event_date, image_url")
    .eq("status", "published")
    .gte("event_date", new Date().toISOString())
    .order("event_date", { ascending: true })
    .limit(60)
    .returns<Pick<Event, "id" | "title" | "slug" | "venue" | "event_date" | "image_url">[]>();
  const events = data ?? [];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-[calc(3rem+env(safe-area-inset-bottom))] pt-8 sm:px-8 sm:pt-12">
      <p className="font-mono text-xs font-black uppercase tracking-[.2em] text-[var(--doors-yellow)]">Cartelera</p>
      <h1 className="mt-2 font-display text-[clamp(2.4rem,9vw,4.2rem)] uppercase leading-[.95] text-white">
        Próximos eventos
      </h1>

      {events.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-[var(--anc-border)] bg-[var(--anc-surface)] px-6 py-12 text-center">
          <p className="text-5xl" aria-hidden="true">🐯</p>
          <p className="mt-4 font-display text-3xl uppercase text-white">Nada por ahora</p>
          <p className="mx-auto mt-2 max-w-[40ch] text-sm leading-6 text-[var(--anc-muted-text)]">
            Tico está atento: cuando se publique un evento nuevo, aparece aquí.
          </p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                href={`/${event.slug}`}
                className="group relative isolate flex min-h-52 flex-col justify-end overflow-hidden rounded-3xl border border-[var(--anc-border)] bg-[var(--anc-surface)] p-5 transition duration-200 active:scale-[.98]"
              >
                {event.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- imágenes de Supabase Storage, tamaño libre
                  <img
                    src={event.image_url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 -z-20 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                ) : null}
                <span className="absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/55 to-black/10" aria-hidden="true" />
                <span className="font-mono text-xs font-bold uppercase tracking-[.12em] text-[var(--doors-yellow)]">
                  {dateFmt.format(new Date(event.event_date))}
                </span>
                <span className="mt-2 font-display text-3xl uppercase leading-[1] text-white">{event.title}</span>
                {event.venue ? <span className="mt-1.5 text-sm text-white/80">{event.venue}</span> : null}
              </Link>
            </li>
          ))}
          {events.length <= 2 ? (
            <li className="flex min-h-52 flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--anc-border)] px-6 text-center">
              <p className="font-display text-2xl uppercase text-white/80">Próximamente</p>
              <p className="mt-1 text-sm text-[var(--anc-muted-text)]">Más fechas en camino.</p>
            </li>
          ) : null}
        </ul>
      )}

      <p className="mt-12 text-center text-sm text-[var(--anc-muted-text)]">
        ¿Produces eventos? <ProducerLink />
      </p>
    </main>
  );
}
