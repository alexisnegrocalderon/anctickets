import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Event } from "@/lib/database.types";

export default async function Home() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .order("event_date", { ascending: true })
    .returns<Event[]>();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <section className="mb-10 rounded-2xl bg-neutral-900 px-8 py-12 text-white">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Vende entradas sin comisiones para ti.
        </h1>
        <p className="mt-3 max-w-xl text-neutral-300">
          El comprador paga un cargo de servicio del 10%, tú recibes el valor
          íntegro de tu entrada directo en tu cuenta de Mercado Pago, al
          instante.
        </p>
        <Link
          href="/dashboard/events/new"
          className="mt-6 inline-block rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-400"
        >
          Crear mi evento
        </Link>
      </section>

      <h2 className="mb-4 text-xl font-bold text-neutral-900">
        Próximos eventos
      </h2>

      {!events || events.length === 0 ? (
        <p className="text-neutral-500">Todavía no hay eventos publicados.</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="group overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition hover:shadow-md"
            >
              <div className="aspect-video w-full bg-neutral-200">
                {event.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={event.image_url}
                    alt={event.title}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-orange-500">
                  {new Date(event.event_date).toLocaleDateString("es-CL", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <h3 className="mt-1 font-semibold text-neutral-900 group-hover:text-orange-600">
                  {event.title}
                </h3>
                {event.venue ? (
                  <p className="mt-1 text-sm text-neutral-500">{event.venue}</p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
