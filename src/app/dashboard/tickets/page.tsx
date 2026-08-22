import { createClient } from "@/lib/supabase/server";
import TicketQr from "./ticket-qr";
import { PageHeader } from "@/components/dashboard/ui";

interface TicketRow {
  id: string;
  qr_code: string;
  status: "valid" | "used" | "cancelled";
  ticket_types: { name: string } | null;
  orders: {
    status: string;
    events: {
      title: string;
      event_date: string;
      venue: string | null;
    } | null;
  } | null;
}

export default async function MyTicketsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: tickets } = await supabase
    .from("tickets")
    .select(
      "id, qr_code, status, ticket_types(name), orders!inner(status, buyer_id, events(title, event_date, venue))"
    )
    .eq("orders.buyer_id", user!.id)
    .order("created_at", { ascending: false })
    .returns<TicketRow[]>();

  const approvedTickets = (tickets ?? []).filter(
    (t) => t.orders?.status === "approved"
  );

  return (
    <div>
      <PageHeader title="Mis entradas" />

      {approvedTickets.length === 0 ? (
        <p className="text-neutral-400">
          Todavía no tienes entradas. Cuando compres, aparecerán aquí con su
          código QR.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {approvedTickets.map((ticket) => (
            <div
              key={ticket.id}
              className="rounded-xl border border-white/10 bg-[#101010] p-5 text-center"
            >
              <p className="font-semibold text-[#f5f4f1]">
                {ticket.orders?.events?.title}
              </p>
              {ticket.orders?.events?.event_date ? (
                <p className="text-sm text-neutral-400">
                  {new Date(ticket.orders.events.event_date).toLocaleString(
                    "es-CL",
                    { dateStyle: "medium", timeStyle: "short" }
                  )}
                </p>
              ) : null}
              <p className="mb-3 text-sm font-medium text-[#c3adff]">
                {ticket.ticket_types?.name}
              </p>
              <div className="mx-auto w-fit rounded-lg bg-white p-3">
                <TicketQr value={ticket.qr_code} />
              </div>
              <p
                className={`mt-3 text-xs font-semibold uppercase ${
                  ticket.status === "used" ? "text-neutral-500" : "text-emerald-400"
                }`}
              >
                {ticket.status === "used" ? "Ya utilizada" : "Válida"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
