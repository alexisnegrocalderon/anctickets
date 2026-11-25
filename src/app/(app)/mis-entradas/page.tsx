import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge, Card } from "@/components/dashboard/ui";
import type { OrderStatus, TicketStatus } from "@/lib/database.types";
import OrderPoller from "./order-poller";
import ResendEmailButton from "./resend-button";

export const metadata: Metadata = { title: "Mis entradas — ANC Tickets" };

interface OrderRow {
  id: string;
  status: OrderStatus;
  kind: string;
  buyer_id: string;
  buyer_email: string;
  total_amount: number;
  created_at: string;
  reserved_until: string | null;
  events: { title: string; slug: string; event_date: string; venue: string | null } | null;
  tickets: {
    id: string;
    qr_code: string;
    status: TicketStatus;
    holder_name: string | null;
    seq: number;
    ticket_types: { name: string } | null;
  }[];
}

const SELECT =
  "id, status, kind, buyer_id, buyer_email, total_amount, created_at, reserved_until, events(title, slug, event_date, venue), tickets(id, qr_code, status, holder_name, seq, ticket_types(name))";

/** Fuera del render para no marcar el componente como impuro. */
function nowMs() {
  return Date.now();
}

const CLOSED: OrderStatus[] = ["rejected", "cancelled", "expired"];

export default async function MyTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: highlighted } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const next = highlighted ? `/mis-entradas?order=${encodeURIComponent(highlighted)}` : "/mis-entradas";
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  // Se lee con service role pero SIEMPRE filtrado por el usuario autenticado:
  // por id de comprador o por el correo de su cuenta (cortesías emitidas a su correo).
  const admin = createAdminClient();
  const emails = user.email ? [...new Set([user.email, user.email.toLowerCase()])] : [];

  const [byId, byEmail] = await Promise.all([
    admin.from("orders").select(SELECT).eq("buyer_id", user.id).returns<OrderRow[]>(),
    emails.length
      ? admin.from("orders").select(SELECT).in("buyer_email", emails).returns<OrderRow[]>()
      : Promise.resolve({ data: [] as OrderRow[] }),
  ]);

  const merged = new Map<string, OrderRow>();
  for (const o of [...(byId.data ?? []), ...(byEmail.data ?? [])]) merged.set(o.id, o);

  const now = nowMs();
  const orders = [...merged.values()]
    .filter((o) => {
      // Las cortesías que el productor emite a nombre de otra persona quedan a su
      // nombre en la base (buyer_id) pero no son suyas: no se le muestran.
      if (o.kind === "courtesy" && o.buyer_id === user.id && o.buyer_email.toLowerCase() !== (user.email ?? "").toLowerCase()) {
        return false;
      }
      if (o.id === highlighted) return true;
      if (CLOSED.includes(o.status)) return false;
      if (o.status === "pending") return !o.reserved_until || new Date(o.reserved_until).getTime() > now;
      return true;
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const hasPendingHighlighted = orders.some((o) => o.id === highlighted && o.status === "pending");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 text-[#f5f4f1] sm:py-14">
      <p className="font-mono text-xs font-bold uppercase tracking-[.2em] text-[var(--anc-accent)]">Tu acceso</p>
      <h1 className="mt-1 text-4xl font-black tracking-tight sm:text-5xl">Mis entradas</h1>

      {hasPendingHighlighted ? <div className="mt-4"><OrderPoller /></div> : null}

      {orders.length === 0 ? (
        <p className="mt-8 text-neutral-400">
          Todavía no tienes entradas. Cuando compres, aparecerán aquí con su código QR.{" "}
          <Link href="/" className="text-[var(--anc-accent-light)] underline">
            Ver eventos
          </Link>
        </p>
      ) : (
        <div className="mt-8 flex flex-col gap-6">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} highlighted={order.id === highlighted} />
          ))}
        </div>
      )}
    </main>
  );
}

function OrderCard({ order, highlighted }: { order: OrderRow; highlighted: boolean }) {
  const event = order.events;
  const tickets = [...order.tickets].sort((a, b) => a.seq - b.seq);

  return (
    <Card className={highlighted ? "ring-2 ring-[var(--anc-accent)]" : ""}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold">{event?.title ?? "Evento"}</h2>
          {event ? (
            <p className="text-sm text-neutral-400">
              {new Date(event.event_date).toLocaleString("es-CL", {
                dateStyle: "full",
                timeStyle: "short",
              })}
              {event.venue ? ` · ${event.venue}` : ""}
            </p>
          ) : null}
        </div>
        <StatusBadge status={order.status} />
      </div>

      {order.status === "pending" ? (
        <p className="mt-4 rounded-lg bg-white/5 px-4 py-3 text-sm text-neutral-300">
          Confirmando pago… Apenas Mercado Pago lo confirme verás tus entradas aquí y te las enviaremos por correo.
        </p>
      ) : null}

      {order.status === "refunded" || order.status === "charged_back" ? (
        <p className="mt-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Esta compra fue {order.status === "refunded" ? "reembolsada" : "revertida"}, por eso las entradas ya no son
          válidas.
        </p>
      ) : null}

      {order.status === "approved" || order.status === "refunded" || order.status === "charged_back" ? (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="rounded-xl border border-white/10 bg-[#0d0d0d] p-4 text-center">
              <p className="text-sm font-semibold text-[var(--anc-accent-light)]">{ticket.ticket_types?.name}</p>
              {ticket.holder_name ? <p className="text-xs text-neutral-400">{ticket.holder_name}</p> : null}
              <div className="mx-auto mt-3 w-fit rounded-lg bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/qr/${ticket.qr_code}`}
                  alt={`Código QR de la entrada ${ticket.ticket_types?.name ?? ""}`}
                  width={180}
                  height={180}
                />
              </div>
              <p
                className={`mt-3 text-xs font-semibold uppercase ${
                  ticket.status === "valid" ? "text-emerald-400" : ticket.status === "used" ? "text-neutral-500" : "text-red-400"
                }`}
              >
                {ticket.status === "valid" ? "Válida" : ticket.status === "used" ? "Ya utilizada" : "Anulada"}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {order.status === "approved" ? (
        <div className="mt-5 border-t border-white/10 pt-4">
          <ResendEmailButton orderId={order.id} />
        </div>
      ) : null}
    </Card>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  switch (status) {
    case "approved":
      return <Badge tone="success">Confirmada</Badge>;
    case "pending":
      return <Badge>Confirmando pago…</Badge>;
    case "refunded":
      return <Badge tone="danger">Reembolsada</Badge>;
    case "charged_back":
      return <Badge tone="danger">Revertida</Badge>;
    case "expired":
      return <Badge tone="danger">Expirada</Badge>;
    default:
      return <Badge tone="danger">No completada</Badge>;
  }
}
