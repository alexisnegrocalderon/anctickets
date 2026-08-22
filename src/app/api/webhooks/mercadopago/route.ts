import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMpPayment, verifyMpWebhookSignature } from "@/lib/mercadopago";
import { sendTicketConfirmationEmail } from "@/lib/email";
import type { Event, Order, OrderItem, TicketType } from "@/lib/database.types";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const paymentId =
    url.searchParams.get("data.id") ?? url.searchParams.get("id");
  const type = url.searchParams.get("type") ?? url.searchParams.get("topic");

  let resolvedPaymentId = paymentId;

  if (!resolvedPaymentId) {
    try {
      const body = await request.json();
      resolvedPaymentId = body?.data?.id ?? null;
    } catch {
      // sin body JSON, seguimos con lo que vino en query params
    }
  }

  if (type && type !== "payment") {
    return NextResponse.json({ received: true });
  }

  if (!resolvedPaymentId) {
    return NextResponse.json({ error: "missing payment id" }, { status: 400 });
  }

  const isValidSignature = verifyMpWebhookSignature({
    xSignature: request.headers.get("x-signature"),
    xRequestId: request.headers.get("x-request-id"),
    dataId: String(resolvedPaymentId),
  });

  if (!isValidSignature) {
    console.error("Firma inválida en webhook de Mercado Pago");
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const admin = createAdminClient();

  try {
    const payment = await getMpPayment(String(resolvedPaymentId));
    const orderId = payment.external_reference as string | undefined;

    if (!orderId) {
      return NextResponse.json({ error: "missing external_reference" }, { status: 400 });
    }

    const { data: order } = await admin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single<Order>();

    if (!order) {
      return NextResponse.json({ error: "order not found" }, { status: 404 });
    }

    // Idempotencia: si ya fue procesada como aprobada, no repetir generación de tickets.
    if (order.status === "approved") {
      return NextResponse.json({ received: true });
    }

    if (payment.status !== "approved") {
      await admin
        .from("orders")
        .update({
          status: payment.status === "rejected" ? "rejected" : "pending",
          mp_payment_id: String(resolvedPaymentId),
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      return NextResponse.json({ received: true });
    }

    const { data: orderItems } = await admin
      .from("order_items")
      .select("*")
      .eq("order_id", orderId)
      .returns<OrderItem[]>();

    if (!orderItems || orderItems.length === 0) {
      return NextResponse.json({ error: "order has no items" }, { status: 400 });
    }

    const ticketsToInsert: { order_id: string; ticket_type_id: string }[] = [];
    for (const item of orderItems) {
      for (let i = 0; i < item.quantity; i++) {
        ticketsToInsert.push({
          order_id: orderId,
          ticket_type_id: item.ticket_type_id,
        });
      }
    }

    const { data: insertedTickets, error: ticketsError } = await admin
      .from("tickets")
      .insert(ticketsToInsert)
      .select("id, qr_code, ticket_type_id");

    if (ticketsError) {
      throw new Error(ticketsError.message);
    }

    for (const item of orderItems) {
      const { data: ticketType } = await admin
        .from("ticket_types")
        .select("sold_count")
        .eq("id", item.ticket_type_id)
        .single<Pick<TicketType, "sold_count">>();

      await admin
        .from("ticket_types")
        .update({
          sold_count: (ticketType?.sold_count ?? 0) + item.quantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.ticket_type_id);
    }

    await admin
      .from("orders")
      .update({
        status: "approved",
        mp_payment_id: String(resolvedPaymentId),
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    const { data: event } = await admin
      .from("events")
      .select("*")
      .eq("id", order.event_id)
      .single<Event>();

    const { data: ticketTypes } = await admin
      .from("ticket_types")
      .select("id, name")
      .eq("event_id", order.event_id)
      .returns<Pick<TicketType, "id" | "name">[]>();

    const ticketTypeNameById = new Map(
      (ticketTypes ?? []).map((tt) => [tt.id, tt.name])
    );

    if (event && insertedTickets) {
      await sendTicketConfirmationEmail({
        to: order.buyer_email,
        eventTitle: event.title,
        eventDate: event.event_date,
        venue: event.venue,
        tickets: insertedTickets.map((t) => ({
          ticketTypeName: ticketTypeNameById.get(t.ticket_type_id) ?? "Entrada",
          qrCode: t.qr_code,
        })),
      });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Error procesando webhook de Mercado Pago:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
