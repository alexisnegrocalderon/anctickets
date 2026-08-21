import { NextResponse } from "next/server";
import { InvalidWebhookSignatureError, WebhookSignatureValidator } from "mercadopago";
import { assertDatabaseConfigured, sql } from "@/lib/db";
import { getMpPayment } from "@/lib/mercadopago";
import { sendTicketConfirmationEmail } from "@/lib/email";

type OrderWithEvent = {
  id: string;
  status: "pending" | "approved" | "rejected" | "cancelled" | "expired";
  buyer_email: string;
  title: string;
  event_date: string;
  venue: string | null;
};

type IssuedTicket = { ticket_id: string; ticket_type_id: string; qr_code: string };

function getPaymentId(url: URL, body: unknown) {
  const fromQuery = url.searchParams.get("data.id") ?? url.searchParams.get("id");
  if (fromQuery) return fromQuery;
  if (body && typeof body === "object" && "data" in body) {
    const data = (body as { data?: { id?: unknown } }).data;
    return data?.id ? String(data.id) : null;
  }
  return null;
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const payload = await request.json().catch(() => null);
  const paymentId = getPaymentId(url, payload);
  const topic = url.searchParams.get("type") ?? url.searchParams.get("topic") ?? (payload as { type?: string } | null)?.type;

  if (!paymentId) return NextResponse.json({ error: "missing payment id" }, { status: 400 });

  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "webhook not configured" }, { status: 503 });

  try {
    WebhookSignatureValidator.validate({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId: paymentId,
      secret,
      toleranceSeconds: 300,
    });
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) {
      return NextResponse.json({ error: "invalid webhook signature" }, { status: 401 });
    }
    console.error("Webhook signature validation failed", error);
    return NextResponse.json({ error: "webhook validation failed" }, { status: 401 });
  }

  if (topic && topic !== "payment") return NextResponse.json({ received: true });

  try {
    assertDatabaseConfigured();
    const payment = await getMpPayment(paymentId);
    const orderId = typeof payment.external_reference === "string" ? payment.external_reference : null;
    if (!orderId) return NextResponse.json({ error: "missing external_reference" }, { status: 400 });

    const eventKey = `${paymentId}:${payment.status ?? "unknown"}`;
    const paymentEvents = await sql.query(
      "insert into payment_events (provider, external_event_id, event_type, payload) values ($1,$2,$3,$4::jsonb) on conflict (provider, external_event_id) do update set payload = excluded.payload returning id, processed_at",
      ["mercadopago", eventKey, topic ?? "payment", JSON.stringify(payload ?? {})]
    ) as unknown as Array<{ id: string; processed_at: string | null }>;
    const paymentEvent = paymentEvents[0];
    if (!paymentEvent) throw new Error("No se pudo registrar el evento de pago");
    if (paymentEvent.processed_at) return NextResponse.json({ received: true });

    const orders = await sql.query(
      "select o.id, o.status, o.buyer_email, e.title, e.event_date, e.venue from orders o join events e on e.id = o.event_id where o.id = $1::uuid",
      [orderId]
    ) as unknown as OrderWithEvent[];
    const order = orders[0];
    if (!order) return NextResponse.json({ error: "order not found" }, { status: 404 });

    if (payment.status !== "approved") {
      const nextStatus = payment.status === "rejected" ? "rejected" : "pending";
      await sql.query("update orders set status = $1::order_status, mp_payment_id = $2, updated_at = now() where id = $3::uuid", [nextStatus, paymentId, orderId]);
      await sql.query("update payment_events set processed_at = now() where id = $1::uuid", [paymentEvent.id]);
      return NextResponse.json({ received: true });
    }

    await sql.query("select * from finalize_paid_order($1::uuid, $2)", [orderId, paymentId]);
    const tickets = await sql.query(
      "select t.id as ticket_id, t.ticket_type_id, t.qr_code, tt.name as ticket_type_name from tickets t join ticket_types tt on tt.id = t.ticket_type_id where t.order_id = $1::uuid order by t.created_at",
      [orderId]
    ) as unknown as Array<IssuedTicket & { ticket_type_name: string }>;

    await sendTicketConfirmationEmail({
      to: order.buyer_email,
      eventTitle: order.title,
      eventDate: order.event_date,
      venue: order.venue,
      tickets: tickets.map((ticket) => ({ ticketTypeName: ticket.ticket_type_name, qrCode: ticket.qr_code })),
    });
    await sql.query("update payment_events set processed_at = now() where id = $1::uuid", [paymentEvent.id]);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Mercado Pago webhook processing failed", error);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
