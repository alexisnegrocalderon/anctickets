import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Event, Order } from "@/lib/database.types";
import { sendTicketConfirmationEmail } from "@/lib/email";

type Admin = SupabaseClient<Database>;

/**
 * Envía el correo con las entradas de una orden aprobada y marca
 * `email_sent_at`. Nunca lanza: si falla, deja `email_sent_at` en null (para
 * reintentar con otra notificación o con el botón "Reenviar correo") y
 * devuelve false (también devuelve false si el correo ya se había enviado).
 */
export async function deliverOrderEmail(
  admin: Admin,
  orderId: string,
  opts: { force?: boolean } = {}
): Promise<boolean> {
  let claimed = false;
  try {
    if (!opts.force) {
      // Se "reclama" el envío de forma atómica: dos notificaciones simultáneas
      // no mandan el correo dos veces.
      const { data } = await admin
        .from("orders")
        .update({ email_sent_at: new Date().toISOString() })
        .eq("id", orderId)
        .eq("status", "approved")
        .is("email_sent_at", null)
        .select("id");
      if (!data || data.length === 0) return false;
      claimed = true;
    }

    const { data: order } = await admin.from("orders").select("*").eq("id", orderId).single<Order>();
    if (!order || order.status !== "approved") throw new Error("La orden no está aprobada");

    const { data: event } = await admin.from("events").select("*").eq("id", order.event_id).single<Event>();
    if (!event) throw new Error("Evento no encontrado");

    const { data: tickets } = await admin
      .from("tickets")
      .select("qr_code, holder_name, ticket_type_id, ticket_types(name)")
      .eq("order_id", orderId)
      .neq("status", "cancelled")
      .order("created_at", { ascending: true })
      .returns<
        { qr_code: string; holder_name: string | null; ticket_types: { name: string } | null }[]
      >();

    if (!tickets || tickets.length === 0) throw new Error("La orden no tiene tickets para enviar");

    await sendTicketConfirmationEmail({
      to: order.buyer_email,
      eventTitle: event.title,
      eventDate: event.event_date,
      venue: event.venue,
      tickets: tickets.map((t) => ({
        ticketTypeName: t.ticket_types?.name ?? "Entrada",
        qrCode: t.qr_code,
        holderName: t.holder_name,
      })),
    });

    await admin.from("orders").update({ email_sent_at: new Date().toISOString() }).eq("id", orderId);
    return true;
  } catch (err) {
    if (claimed) {
      await admin.from("orders").update({ email_sent_at: null }).eq("id", orderId);
    }
    console.error(`No se pudo enviar el correo de la orden ${orderId}:`, err);
    return false;
  }
}
