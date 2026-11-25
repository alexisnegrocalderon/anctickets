import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  Ambassador,
  DiscountCode,
  Event,
  EventStaff,
  TicketType,
} from "@/lib/database.types";
import {
  changeEventStatus,
  deleteEvent,
  saveEventForm,
} from "../../actions";
import { Card, Field, Input, LinkButton, PageHeader, Textarea } from "@/components/dashboard/ui";
import ActionForm from "@/components/dashboard/action-form";
import CopyEventLinkButton from "@/components/dashboard/copy-event-link-button";
import ImageUpload from "@/components/dashboard/image-upload";
import SlugField from "@/components/dashboard/slug-field";
import ThemePicker from "@/components/dashboard/theme-picker";
import { siteUrl } from "@/lib/site";
import SalesSection, { type SalesData } from "./sales-section";
import TicketTypesSection from "./ticket-types-section";
import DiscountCodesSection from "./discount-codes-section";
import AmbassadorsSection from "./ambassadors-section";
import StaffSection from "./staff-section";
import CourtesySection from "./courtesy-section";

interface OrderStatsRow {
  id: string;
  ambassador_id: string | null;
  service_fee_amount: number;
  discount_amount: number;
  kind: string;
  buyer_email: string;
  email_sent_at: string | null;
  order_items: { quantity: number; unit_base_price: number }[];
}

const PAGE_SIZE = 1000;

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

  const [ticketTypesRes, codesRes, ambassadorsRes, staffRes, profileRes] = await Promise.all([
    supabase
      .from("ticket_types")
      .select("*")
      .eq("event_id", id)
      .order("created_at", { ascending: true })
      .returns<TicketType[]>(),
    supabase
      .from("discount_codes")
      .select("*")
      .eq("event_id", id)
      .order("created_at", { ascending: false })
      .returns<DiscountCode[]>(),
    supabase
      .from("ambassadors")
      .select("*")
      .eq("organizer_id", user.id)
      .or(`event_id.eq.${id},event_id.is.null`)
      .order("created_at", { ascending: true })
      .returns<Ambassador[]>(),
    supabase
      .from("event_staff")
      .select("*")
      .eq("event_id", id)
      .order("created_at", { ascending: true })
      .returns<EventStaff[]>(),
    supabase.from("profiles").select("mp_connected").eq("id", user.id).single<{ mp_connected: boolean }>(),
  ]);

  const ticketTypes = ticketTypesRes.data ?? [];
  const codes = codesRes.data ?? [];
  const ambassadors = ambassadorsRes.data ?? [];
  const staff = staffRes.data ?? [];
  const mpConnected = !!profileRes.data?.mp_connected;

  // Órdenes aprobadas (en páginas de 1000: PostgREST corta ahí por defecto).
  const orders: OrderStatsRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data } = await supabase
      .from("orders")
      .select("id, ambassador_id, service_fee_amount, discount_amount, kind, buyer_email, email_sent_at, order_items(quantity, unit_base_price)")
      .eq("event_id", id)
      .eq("status", "approved")
      .order("created_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
      .returns<OrderStatsRow[]>();
    orders.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }

  const [{ count: checkedInTotal }, { count: issuedTotal }] = await Promise.all([
    supabase.from("tickets").select("id", { count: "exact", head: true }).eq("event_id", id).eq("status", "used"),
    supabase.from("tickets").select("id", { count: "exact", head: true }).eq("event_id", id).neq("status", "cancelled"),
  ]);

  const checkedInByType = new Map<string, number>();
  await Promise.all(
    ticketTypes.map(async (tt) => {
      const { count } = await supabase
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("ticket_type_id", tt.id)
        .eq("status", "used");
      checkedInByType.set(tt.id, count ?? 0);
    })
  );

  // Totales de ventas y por embajador.
  let revenueBase = 0;
  let serviceFeesPaid = 0;
  let discountsGiven = 0;
  let courtesyTickets = 0;
  const byAmbassador = new Map<string, { orders: number; tickets: number; grossBase: number }>();

  for (const order of orders) {
    const qty = order.order_items.reduce((s, i) => s + i.quantity, 0);
    const base = order.order_items.reduce((s, i) => s + i.quantity * Number(i.unit_base_price), 0);
    revenueBase += base;
    serviceFeesPaid += Number(order.service_fee_amount);
    discountsGiven += Number(order.discount_amount);
    if (order.kind === "courtesy") courtesyTickets += qty;
    if (order.ambassador_id) {
      const acc = byAmbassador.get(order.ambassador_id) ?? { orders: 0, tickets: 0, grossBase: 0 };
      acc.orders += 1;
      acc.tickets += qty;
      acc.grossBase += base;
      byAmbassador.set(order.ambassador_id, acc);
    }
  }

  const unsentEmails = orders
    .filter((o) => !o.email_sent_at)
    .map((o) => ({ id: o.id, email: o.buyer_email }));

  const sales: SalesData = {
    ticketsSold: ticketTypes.reduce((sum, tt) => sum + tt.sold_count, 0),
    ticketsTotal: ticketTypes.reduce((sum, tt) => sum + tt.quantity, 0),
    unsentEmails,
    revenueBase,
    serviceFeesPaid,
    discountsGiven,
    courtesyTickets,
    checkedIn: checkedInTotal ?? 0,
    issued: issuedTotal ?? 0,
    perType: ticketTypes.map((tt) => ({
      id: tt.id,
      name: tt.name,
      sold: tt.sold_count,
      reserved: tt.reserved_count,
      quantity: tt.quantity,
      checkedIn: checkedInByType.get(tt.id) ?? 0,
    })),
  };

  const site = siteUrl();
  const siteHost = site.replace(/^https?:\/\//, "") || "tickets.ancdigital.cl";
  const hasPaidTypes = ticketTypes.some((tt) => Number(tt.base_price) > 0);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={event.title}
        subtitle={`Estado: ${event.status === "published" ? "Publicado" : event.status === "cancelled" ? "Cancelado" : "Borrador"}`}
        actions={
          <>
            {event.status !== "published" ? (
              <ActionForm
                action={changeEventStatus.bind(null, id, "published")}
                submitLabel="Publicar"
                submitVariant="dangerSolid"
              />
            ) : (
              <ActionForm
                action={changeEventStatus.bind(null, id, "draft")}
                submitLabel="Pasar a borrador"
                submitVariant="outline"
              />
            )}
            <CopyEventLinkButton slug={event.slug} />
            <LinkButton href={`/${event.slug}`}>Ver página pública</LinkButton>
            <LinkButton href={`/scan/${id}`}>Validar entradas</LinkButton>
          </>
        }
      />

      {event.status !== "published" && hasPaidTypes && !mpConnected ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--anc-accent)]/30 bg-[var(--anc-accent)]/10 px-5 py-4">
          <p className="text-sm text-neutral-200">
            Para publicar un evento con entradas de pago necesitas conectar tu cuenta de Mercado Pago.
          </p>
          <LinkButton variant="primary" href="/dashboard/mercadopago/connect">
            Conectar Mercado Pago
          </LinkButton>
        </div>
      ) : null}

      <SalesSection eventId={id} data={sales} />

      <Card className="mb-6">
        <h2 className="mb-4 font-semibold text-[#f5f4f1]">Datos del evento</h2>
        <ActionForm
          action={saveEventForm.bind(null, id)}
          className="flex flex-col gap-4"
          submitLabel="Guardar cambios"
          submitClassName="self-start"
        >
          <div className="flex flex-col gap-4">
            <Field label="Título">
              <Input name="title" defaultValue={event.title} required />
            </Field>
            <Field label="Link de tu evento">
              <SlugField defaultValue={event.slug} host={siteHost} />
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
            <Field label="Mood / color de marca">
              <ThemePicker defaultTheme={event.theme} defaultAccentColor={event.accent_color} />
            </Field>
            <Field label="Tu logo (opcional — reemplaza el logo de ANC en tu página)">
              <ImageUpload variant="logo" name="organizer_logo_url" defaultValue={event.organizer_logo_url} />
            </Field>
          </div>
        </ActionForm>
      </Card>

      <TicketTypesSection eventId={id} ticketTypes={ticketTypes} />

      <DiscountCodesSection eventId={id} codes={codes} ticketTypes={ticketTypes} />

      <AmbassadorsSection
        eventId={id}
        eventSlug={event.slug}
        site={site}
        ambassadors={ambassadors}
        stats={Object.fromEntries(byAmbassador)}
      />

      <StaffSection eventId={id} staff={staff} scanUrl={`${site}/scan/${id}`} />

      <CourtesySection eventId={id} ticketTypes={ticketTypes} />

      <Card className="border-red-500/30 bg-red-500/10">
        <h2 className="mb-2 font-semibold text-red-300">Zona de peligro</h2>
        <div className="flex flex-col gap-5">
          {event.status !== "cancelled" ? (
            <div>
              <p className="mb-3 text-sm text-red-200/80">
                Cancelar el evento lo saca de la venta pero conserva las ventas, las entradas y los datos de tus
                compradores. Los reembolsos los coordinas tú con ellos desde Mercado Pago.
              </p>
              <ActionForm
                action={changeEventStatus.bind(null, id, "cancelled")}
                submitLabel="Cancelar evento"
                submitVariant="danger"
                confirmMessage="¿Cancelar este evento? Dejará de estar a la venta."
              />
            </div>
          ) : null}
          <div>
            <p className="mb-3 text-sm text-red-200/80">
              Eliminar borra el evento y sus tipos de entrada, y no se puede deshacer. Solo está disponible si el
              evento no tiene ventas.
            </p>
            <ActionForm
              action={deleteEvent.bind(null, id)}
              submitLabel="Eliminar evento"
              submitVariant="danger"
              confirmMessage="¿Eliminar este evento para siempre?"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

function toLocalInputValue(isoDate: string) {
  const date = new Date(isoDate);
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}
