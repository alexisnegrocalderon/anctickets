import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events, ticketTypes } from "@/lib/db/schema";
import BuyForm from "./buy-form";

export default async function EventPublicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [event] = await db.select().from(events).where(and(eq(events.id, id), eq(events.status, "published")));

  if (!event) notFound();

  const eventTicketTypes = await db.select().from(ticketTypes).where(eq(ticketTypes.eventId, event.id)).orderBy(asc(ticketTypes.basePrice));
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <div className="mb-6 overflow-hidden rounded-2xl bg-neutral-200">
        {event.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.imageUrl}
            alt={event.title}
            className="aspect-video w-full object-cover"
          />
        ) : (
          <div className="aspect-video w-full" />
        )}
      </div>

      <p className="text-sm font-semibold uppercase tracking-wide text-orange-500">
        {new Date(event.eventDate).toLocaleString("es-CL", {
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
        {eventTicketTypes.length === 0 ? (
          <p className="text-neutral-500">
            Este evento todavía no tiene entradas disponibles.
          </p>
        ) : (
          <BuyForm
            eventId={event.id}
            ticketTypes={eventTicketTypes.map((ticketType) => ({ id: ticketType.id, name: ticketType.name, basePrice: Number(ticketType.basePrice), capacity: ticketType.capacity, soldCount: ticketType.soldCount, reservedCount: ticketType.reservedCount }))}
            isLoggedIn={!!session}
          />
        )}
      </section>
    </main>
  );
}
