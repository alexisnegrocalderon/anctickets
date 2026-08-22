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
  const inputClass =
    "rounded-lg border border-white/15 bg-transparent px-3 py-2 text-sm text-[#f5f4f1] placeholder:text-neutral-500 transition focus:border-[#a77fff] focus:outline-none";
  const outlineButtonClass =
    "rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-[#f5f4f1] transition hover:border-[#c3adff] hover:text-[#c3adff]";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-[#f5f4f1]">
          {event.title}
        </h1>
        <div className="flex gap-2">
          {event.status !== "published" ? (
            <form action={setEventStatus.bind(null, id, "published")}>
              <button className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-[#0b0b0b] transition hover:bg-emerald-400">
                Publicar
              </button>
            </form>
          ) : (
            <form action={setEventStatus.bind(null, id, "draft")}>
              <button className={outlineButtonClass}>Pasar a borrador</button>
            </form>
          )}
          <Link href={`/events/${id}`} className={outlineButtonClass}>
            Ver página pública
          </Link>
          <Link
            href={`/dashboard/events/${id}/scan`}
            className={outlineButtonClass}
          >
            Validar entradas
          </Link>
        </div>
      </div>

      <section className="mb-8 rounded-xl border border-white/10 bg-[#101010] p-5">
        <h2 className="mb-4 font-semibold text-[#f5f4f1]">Datos del evento</h2>
        <form action={boundUpdateEvent} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-300">
            Título
            <input
              name="title"
              defaultValue={event.title}
              required
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-300">
            Descripción
            <textarea
              name="description"
              defaultValue={event.description ?? ""}
              rows={4}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-300">
            Lugar
            <input
              name="venue"
              defaultValue={event.venue ?? ""}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-300">
            Fecha y hora
            <input
              type="datetime-local"
              name="event_date"
              defaultValue={toLocalInputValue(event.event_date)}
              required
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-300">
            URL de imagen
            <input
              name="image_url"
              defaultValue={event.image_url ?? ""}
              className={inputClass}
            />
          </label>
          <button
            type="submit"
            className="self-start rounded-full bg-[#a77fff] px-6 py-2.5 text-sm font-semibold text-[#120d1b] transition hover:bg-[#c3adff]"
          >
            Guardar cambios
          </button>
        </form>
      </section>

      <section className="mb-8 rounded-xl border border-white/10 bg-[#101010] p-5">
        <h2 className="mb-4 font-semibold text-[#f5f4f1]">
          Tipos de entrada
        </h2>

        {ticketTypes && ticketTypes.length > 0 ? (
          <div className="mb-5 divide-y divide-white/10 rounded-lg border border-white/10">
            {ticketTypes.map((tt) => {
              const fees = calculateFees(tt.base_price);
              return (
                <div
                  key={tt.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-[#f5f4f1]">{tt.name}</p>
                    <p className="text-sm text-neutral-400">
                      ${tt.base_price.toLocaleString("es-CL")} base · total
                      comprador ${fees.totalAmount.toLocaleString("es-CL")} ·
                      cupo {tt.sold_count}/{tt.quantity}
                    </p>
                  </div>
                  <form action={deleteTicketType.bind(null, id, tt.id)}>
                    <button className="text-sm font-medium text-red-400 hover:text-red-300">
                      Eliminar
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mb-5 text-sm text-neutral-400">
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
            className={`${inputClass} sm:col-span-1`}
          />
          <input
            name="base_price"
            type="number"
            min="0"
            step="1"
            required
            placeholder="Precio base ($)"
            className={inputClass}
          />
          <input
            name="quantity"
            type="number"
            min="0"
            step="1"
            required
            placeholder="Cupo"
            className={inputClass}
          />
          <button
            type="submit"
            className="rounded-full bg-[#a77fff] px-4 py-2 text-sm font-semibold text-[#120d1b] transition hover:bg-[#c3adff] sm:col-span-3 sm:w-fit"
          >
            + Agregar tipo de entrada
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-red-500/30 bg-red-500/10 p-5">
        <h2 className="mb-2 font-semibold text-red-300">Zona de peligro</h2>
        <p className="mb-3 text-sm text-red-200/80">
          Eliminar el evento borrará también sus tipos de entrada. No se puede
          deshacer.
        </p>
        <form action={deleteEvent.bind(null, id)}>
          <button className="rounded-full border border-red-500/40 bg-transparent px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/10">
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
