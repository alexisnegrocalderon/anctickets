import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, orders, ticketTypes, tickets } from "@/lib/db/schema";
import { requireCurrentUser } from "@/lib/organizer";
import TicketQr from "./ticket-qr";

/** Las entradas del comprador se leen solo desde órdenes aprobadas y tickets emitidos en Neon. */
export default async function MyTicketsPage() {
  const user = await requireCurrentUser();
  const approvedTickets = await db
    .select({ ticket: tickets, ticketTypeName: ticketTypes.name, eventTitle: events.title, eventDate: events.eventDate, venue: events.venue })
    .from(tickets)
    .innerJoin(orders, eq(tickets.orderId, orders.id))
    .innerJoin(events, eq(orders.eventId, events.id))
    .innerJoin(ticketTypes, eq(tickets.ticketTypeId, ticketTypes.id))
    .where(and(eq(orders.buyerId, user.id), eq(orders.status, "approved")))
    .orderBy(desc(tickets.createdAt));

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-neutral-900">Mis entradas</h1>
      <p className="mb-6 text-sm text-neutral-500">Solo aparecen tickets emitidos luego de una orden aprobada.</p>
      {approvedTickets.length === 0 ? (
        <p className="text-neutral-500">Todavía no tienes entradas. Cuando una compra se apruebe, aparecerá aquí con su código QR.</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {approvedTickets.map(({ ticket, ticketTypeName, eventTitle, eventDate, venue }) => (
            <div key={ticket.id} className="rounded-xl border border-neutral-200 bg-white p-5 text-center">
              <p className="font-semibold text-neutral-900">{eventTitle}</p>
              <p className="mt-1 text-sm text-neutral-500">{new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(eventDate)}{venue ? ` · ${venue}` : ""}</p>
              <p className="mb-3 mt-2 text-sm font-medium text-[#7652c7]">{ticketTypeName}</p>
              <TicketQr value={ticket.qrCode} />
              <p className={`mt-3 text-xs font-semibold uppercase ${ticket.status === "used" ? "text-neutral-400" : ticket.status === "cancelled" ? "text-red-600" : "text-emerald-600"}`}>
                {ticket.status === "used" ? "Ya utilizada" : ticket.status === "cancelled" ? "Cancelada" : "Válida"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
