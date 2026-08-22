import { notFound, redirect } from "next/navigation";
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
import { Button, Card, Field, Input, LinkButton, PageHeader, Textarea } from "@/components/dashboard/ui";
import CopyEventLinkButton from "@/components/dashboard/copy-event-link-button";
import ImageUpload from "@/components/dashboard/image-upload";

interface SalesSummary {
  ticketsSold: number;
  ticketsTotal: number;
  revenue: number;
}

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

  const { data: approvedOrders } = await supabase
    .from("orders")
    .select("total_amount")
    .eq("event_id", id)
    .eq("status", "approved")
    .returns<{ total_amount: number }[]>();

  const summary: SalesSummary = {
    ticketsSold: (ticketTypes ?? []).reduce((sum, tt) => sum + tt.sold_count, 0),
    ticketsTotal: (ticketTypes ?? []).reduce((sum, tt) => sum + tt.quantity, 0),
    revenue: (approvedOrders ?? []).reduce((sum, o) => sum + o.total_amount, 0),
  };

  const boundUpdateEvent = updateEvent.bind(null, id);
  const boundCreateTicketType = createTicketType.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={event.title}
        subtitle={`Estado: ${event.status === "published" ? "Publicado" : event.status === "cancelled" ? "Cancelado" : "Borrador"}`}
        actions={
          <>
            {event.status !== "published" ? (
              <form action={setEventStatus.bind(null, id, "published")}>
                <Button variant="dangerSolid" type="submit">Publicar</Button>
              </form>
            ) : (
              <form action={setEventStatus.bind(null, id, "draft")}>
                <Button variant="outline" type="submit">Pasar a borrador</Button>
              </form>
            )}
            <CopyEventLinkButton slug={event.slug} />
            <LinkButton href={`/${event.slug}`}>Ver página pública</LinkButton>
            <LinkButton href={`/dashboard/events/${id}/scan`}>Validar entradas</LinkButton>
          </>
        }
      />

      <Card className="mb-6">
        <h2 className="mb-4 font-semibold text-[#f5f4f1]">Resumen de ventas</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-2xl font-bold text-[#f5f4f1]">
              {summary.ticketsSold}
              <span className="text-base font-normal text-neutral-500">/{summary.ticketsTotal}</span>
            </p>
            <p className="text-sm text-neutral-400">Entradas vendidas</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#a77fff]">
              ${summary.revenue.toLocaleString("es-CL")}
            </p>
            <p className="text-sm text-neutral-400">Ingresos totales (aprobados)</p>
          </div>
          <div className="flex items-end">
            <a
              href={`/api/dashboard/events/${id}/export`}
              className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-[#f5f4f1] transition hover:border-[#c3adff] hover:text-[#c3adff]"
            >
              Exportar compradores (CSV)
            </a>
          </div>
        </div>
      </Card>

      <Card className="mb-6">
        <h2 className="mb-4 font-semibold text-[#f5f4f1]">Datos del evento</h2>
        <form action={boundUpdateEvent} className="flex flex-col gap-4">
          <Field label="Título">
            <Input name="title" defaultValue={event.title} required />
          </Field>
          <Field label="Descripción">
            <Textarea name="description" defaultValue={event.description ?? ""} rows={4} />
          </Field>
          <Field label="Lugar">
            <Input name="venue" defaultValue={event.venue ?? ""} />
          </Field>
          <Field label="Fecha y hora">
            <Input
              type="datetime-local"
              name="event_date"
              defaultValue={toLocalInputValue(event.event_date)}
              required
            />
          </Field>
          <Field label="Imagen">
            <ImageUpload name="image_url" defaultValue={event.image_url} />
          </Field>
          <Button type="submit" variant="primary" className="self-start">
            Guardar cambios
          </Button>
        </form>
      </Card>

      <Card className="mb-6">
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
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#f5f4f1]">{tt.name}</p>
                    <p className="text-sm text-neutral-400">
                      ${tt.base_price.toLocaleString("es-CL")} base · total
                      comprador ${fees.totalAmount.toLocaleString("es-CL")} ·
                      cupo {tt.sold_count}/{tt.quantity}
                    </p>
                  </div>
                  <form action={deleteTicketType.bind(null, id, tt.id)}>
                    <button className="shrink-0 text-sm font-medium text-red-400 hover:text-red-300">
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
          <Input name="name" required placeholder="Nombre (ej. General)" />
          <Input name="base_price" type="number" min="0" step="1" required placeholder="Precio base ($)" />
          <Input name="quantity" type="number" min="0" step="1" required placeholder="Cupo" />
          <Button type="submit" variant="primary" className="sm:col-span-3 sm:w-fit">
            + Agregar tipo de entrada
          </Button>
        </form>
      </Card>

      <Card className="border-red-500/30 bg-red-500/10">
        <h2 className="mb-2 font-semibold text-red-300">Zona de peligro</h2>
        <p className="mb-3 text-sm text-red-200/80">
          Eliminar el evento borrará también sus tipos de entrada. No se puede
          deshacer.
        </p>
        <form action={deleteEvent.bind(null, id)}>
          <Button variant="danger" type="submit">Eliminar evento</Button>
        </form>
      </Card>
    </div>
  );
}

function toLocalInputValue(isoDate: string) {
  const date = new Date(isoDate);
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}
