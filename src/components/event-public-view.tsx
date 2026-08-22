import type { Event, TicketType } from "@/lib/database.types";
import BuyForm from "@/app/(app)/events/[id]/buy-form";

export default function EventPublicView({
  event,
  ticketTypes,
  isLoggedIn,
}: {
  event: Event;
  ticketTypes: TicketType[] | null;
  isLoggedIn: boolean;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <div className="mb-6 overflow-hidden rounded-2xl bg-neutral-200">
        {event.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.image_url}
            alt={event.title}
            className="aspect-video w-full object-cover"
          />
        ) : (
          <div className="aspect-video w-full" />
        )}
      </div>

      <p className="text-sm font-semibold uppercase tracking-wide text-orange-500">
        {new Date(event.event_date).toLocaleString("es-CL", {
          dateStyle: "full",
          timeStyle: "short",
        })}
      </p>
      <h1 className="mt-1 text-3xl font-extrabold text-neutral-900">
        {event.title}
      </h1>
      {event.venue ? (
        <p className="mt-1 text-neutral-500">{event.venue}</p>
      ) : null}
      {event.description ? (
        <p className="mt-4 whitespace-pre-line text-neutral-700">
          {event.description}
        </p>
      ) : null}

      <section className="mt-8 rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-neutral-900">Entradas</h2>
        {!ticketTypes || ticketTypes.length === 0 ? (
          <p className="text-neutral-500">
            Este evento todavía no tiene entradas disponibles.
          </p>
        ) : (
          <BuyForm
            eventId={event.id}
            eventSlug={event.slug}
            ticketTypes={ticketTypes}
            isLoggedIn={isLoggedIn}
          />
        )}
      </section>
    </main>
  );
}
