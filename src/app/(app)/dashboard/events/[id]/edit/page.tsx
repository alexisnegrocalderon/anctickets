import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Event, TicketType } from "@/lib/database.types";
import { calculateFees } from "@/lib/fees";
import {
  updateEvent,
  setEventStatus,
  deleteEvent,
  createTicketType,
  deleteTicketType,
} from "../../actions";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single<Event>();

  if (!event || event.organizer_id !== user.id) {
    notFound();
  }

  const { data: ticketTypes } = await supabase
    .from("ticket_types")
    .select("*")
    .eq("event_id", id)
    .order("created_at", { ascending: true })
    .returns<TicketType[]>();

  const boundUpdateEvent = updateEvent.bind(null, id);
  const boundCreateTicketType = createTicketType.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">{event.title}</h1>
        <div className="flex gap-2">
          {event.status !== "published" ? (
            <form action={setEventStatus.bind(null, id, "published")}>
              <button className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500">
                Publicar
              </button>
            </form>
          ) : (
            <form action={setEventStatus.bind(null, id, "draft")}>
              <button className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
                Pasar a borrador
              </button>
            </form>
          )}
          <Link
            href={`/events/${id}`}
            className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            Ver página pública
          </Link>
          <Link
            href={`/dashboard/events/${id}/scan`}
            className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            Validar entradas
          </Link>
        </div>
      </div>

      <section className="mb-8 rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-neutral-900">
          Datos del evento
        </h2>
        <form action={boundUpdateEvent} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
            Título
            <input
              name="title"
              defaultValue={event.title}
              required
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
            Descripción
            <textarea
              name="description"
              defaultValue={event.description ?? ""}
              rows={4}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
            Lugar
            <input
              name="venue"
              defaultValue={event.venue ?? ""}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
            Fecha y hora
            <input
              type="datetime-local"
              name="event_date"
              defaultValue={toLocalInputValue(event.event_date)}
              required
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
            URL de imagen
            <input
              name="image_url"
              defaultValue={event.image_url ?? ""}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            className="self-start rounded-full bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700"
          >
            Guardar cambios
          </button>
        </form>
      </section>

      <section className="mb-8 rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-neutral-900">
          Tipos de entrada
        </h2>

        {ticketTypes && ticketTypes.length > 0 ? (
          <div className="mb-5 divide-y divide-neutral-200 rounded-lg border border-neutral-200">
            {ticketTypes.map((tt) => {
              const fees = calculateFees(tt.base_price);
              return (
                <div
                  key={tt.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-neutral-900">{tt.name}</p>
                    <p className="text-sm text-neutral-500">
                      ${tt.base_price.toLocaleString("es-CL")} base · total
                      comprador ${fees.totalAmount.toLocaleString("es-CL")} ·
                      cupo {tt.sold_count}/{tt.quantity}
                    </p>
                  </div>
                  <form action={deleteTicketType.bind(null, id, tt.id)}>
                    <button className="text-sm font-medium text-red-600 hover:text-red-500">
                      Eliminar
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mb-5 text-sm text-neutral-500">
            Aún no agregas tipos de entrada.
          </p>
        )}

        <form
          action={boundCreateTicketType}
          className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          <input
            name="name"
            required
            placeholder="Nombre (ej. General)"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm sm:col-span-1"
          />
          <input
            name="base_price"
            type="number"
            min="0"
            step="1"
            required
            placeholder="Precio base ($)"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <input
            name="quantity"
            type="number"
            min="0"
            step="1"
            required
            placeholder="Cupo"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700 sm:col-span-3 sm:w-fit"
          >
            + Agregar tipo de entrada
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-red-200 bg-red-50 p-5">
        <h2 className="mb-2 font-semibold text-red-800">Zona de peligro</h2>
        <p className="mb-3 text-sm text-red-700">
          Eliminar el evento borrará también sus tipos de entrada. No se puede
          deshacer.
        </p>
        <form action={deleteEvent.bind(null, id)}>
          <button className="rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100">
            Eliminar evento
          </button>
        </form>
      </section>
    </div>
  );
}

function toLocalInputValue(isoDate: string) {
  const date = new Date(isoDate);
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}
