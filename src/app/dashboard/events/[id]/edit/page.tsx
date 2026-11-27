import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  Ambassador,
  DiscountCode,
  Event,
  EventNotice,
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
import EditTabs from "./edit-tabs";
import EventActionsSheet, { NoticeButton } from "./event-actions-sheet";
import EmailSection from "./email-section";
import type { NoticeSheetData } from "./event-notice-sheet";
import { validateContactEmail } from "@/lib/email/sanitize";
import { MAX_NOTICE_RECIPIENTS } from "@/lib/email/send";
import { NOTICE_MAX_PER_EVENT } from "@/lib/email/deliver";
import SalesSection, { type SalesData } from "./sales-section";
import TicketTypesSection from "./ticket-types-section";
import { serverClock } from "@/lib/tiers";
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

// Los avisos masivos pueden tardar: se envían por lotes con pausa entre bloques.
export const maxDuration = 60;

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
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

  // Avisos a compradores: destinatarios únicos con correo válido e historial (tolera tabla ausente).
  const noticeRecipients = new Set<string>();
  for (const o of orders) {
    const email = validateContactEmail(o.buyer_email);
    if (email) noticeRecipients.add(email);
  }
  let notices: EventNotice[] = [];
  try {
    const { data: noticeRows } = await supabase
      .from("event_notices")
      .select("*")
      .eq("event_id", id)
      .order("created_at", { ascending: false })
      .returns<EventNotice[]>();
    notices = noticeRows ?? [];
  } catch {
    notices = [];
  }
  const noticeData: NoticeSheetData = {
    recipientCount: Math.min(noticeRecipients.size, MAX_NOTICE_RECIPIENTS),
    notices,
    maxNotices: NOTICE_MAX_PER_EVENT,
  };

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

  const statusText =
    event.status === "published" ? "Publicado" : event.status === "cancelled" ? "Cancelado" : "Borrador";

  const resumen = (
    <>
      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatTile label="Recaudado" value={`$${Math.round(sales.revenueBase).toLocaleString("es-CL")}`} accent />
        <StatTile label="Vendidas" value={`${sales.ticketsSold}/${sales.ticketsTotal}`} />
        <StatTile label="Ingresaron" value={`${sales.checkedIn}/${sales.issued}`} />
      </div>

      {event.status !== "published" && hasPaidTypes && !mpConnected ? (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-[var(--anc-vermilion)]/40 bg-[var(--anc-vermilion)]/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-neutral-200">
            Para publicar un evento con entradas de pago necesitas conectar tu cuenta de Mercado Pago.
          </p>
          <LinkButton variant="primary" href="/dashboard/mercadopago/connect" className="shrink-0">
            Conectar Mercado Pago
          </LinkButton>
        </div>
      ) : null}

      <Card className="mb-6">
        <h2 className="mb-4 text-2xl uppercase text-white">Datos del evento</h2>
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

      <Card className="border-red-500/30 bg-red-500/10">
        <h2 className="mb-2 text-2xl uppercase text-red-300">Zona de peligro</h2>
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
    </>
  );

  return (
    <div>
      <PageHeader
        title={event.title}
        subtitle={`Estado: ${statusText}`}
        actions={
          <>
            {event.status !== "published" ? (
              <ActionForm
                action={changeEventStatus.bind(null, id, "published")}
                submitLabel="Publicar"
                submitVariant="primary"
              />
            ) : (
              <ActionForm
                action={changeEventStatus.bind(null, id, "draft")}
                submitLabel="Pasar a borrador"
                submitVariant="outline"
              />
            )}
            {/* Escritorio y tablet: acciones a la vista. Celular: en una hoja. */}
            <div className="hidden flex-wrap gap-2 md:flex">
              <CopyEventLinkButton slug={event.slug} />
              <LinkButton href={`/${event.slug}`}>Ver página pública</LinkButton>
              <LinkButton href={`/scan/${id}`}>Validar entradas</LinkButton>
              <NoticeButton eventId={id} notice={noticeData} />
            </div>
            <EventActionsSheet slug={event.slug} eventId={id} notice={noticeData} />
          </>
        }
      />

      <EditTabs
        initialTab={tab}
        tabs={[
          { id: "resumen", label: "Resumen", content: resumen },
          { id: "entradas", label: "Entradas", content: <TicketTypesSection eventId={id} ticketTypes={ticketTypes} serverNow={serverClock()} eventDateIso={event.event_date} /> },
          {
            id: "descuentos",
            label: "Descuentos",
            content: <DiscountCodesSection eventId={id} codes={codes} ticketTypes={ticketTypes} />,
          },
          {
            id: "embajadores",
            label: "Embajadores",
            content: (
              <AmbassadorsSection
                eventId={id}
                eventSlug={event.slug}
                site={site}
                ambassadors={ambassadors}
                stats={Object.fromEntries(byAmbassador)}
              />
            ),
          },
          {
            id: "staff",
            label: "Staff",
            content: <StaffSection eventId={id} staff={staff} scanUrl={`${site}/scan/${id}`} />,
          },
          {
            id: "correo",
            label: "Correo",
            content: (
              <EmailSection
                eventId={id}
                sessionEmail={user.email ?? null}
                initial={{
                  welcome: event.email_welcome ?? "",
                  access: event.email_access ?? "",
                  rules: event.email_rules ?? "",
                  directions: event.email_directions ?? "",
                  contactEmail: event.contact_email ?? "",
                  instagram: event.contact_instagram ?? "",
                  whatsapp: event.contact_whatsapp ?? "",
                  useEventImage: event.email_use_event_image ?? true,
                }}
              />
            ),
          },
          { id: "cortesias", label: "Cortesías", content: <CourtesySection eventId={id} ticketTypes={ticketTypes} /> },
          { id: "ventas", label: "Ventas", content: <SalesSection eventId={id} data={sales} /> },
        ]}
      />
    </div>
  );
}

function StatTile({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="min-w-0 rounded-2xl border border-[var(--anc-border)] bg-[var(--anc-surface)] p-3 sm:p-4">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-[var(--anc-muted-text)]">{label}</p>
      <p
        className={`mt-1 truncate font-display text-2xl leading-none sm:text-3xl ${
          accent ? "text-[var(--anc-vermilion)]" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function toLocalInputValue(isoDate: string) {
  const date = new Date(isoDate);
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}
