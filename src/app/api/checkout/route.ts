import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { assertDatabaseConfigured, db, sql } from "@/lib/db";
import { events, mpAccounts, ticketTypes } from "@/lib/db/schema";
import { calculateFees } from "@/lib/fees";
import { createMpPreference } from "@/lib/mercadopago";

interface CheckoutItemInput {
  ticketTypeId: string;
  quantity: number;
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.email) {
    return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 });
  }

  const body = await request.json();
  const eventId = String(body.eventId ?? "");
  const items: CheckoutItemInput[] = Array.isArray(body.items) ? body.items : [];

  if (!eventId || items.length === 0) {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  if (!eventId || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  try {
    assertDatabaseConfigured();
    const [event] = await db
      .select({ eventId: events.id, eventTitle: events.title, organizationId: events.organizationId, organizerAccessToken: mpAccounts.accessToken })
      .from(events)
      .innerJoin(mpAccounts, eq(mpAccounts.organizationId, events.organizationId))
      .where(and(eq(events.id, eventId), eq(events.status, "published")));

    if (!event) {
      return NextResponse.json({ error: "Evento no disponible o sin Mercado Pago conectado" }, { status: 404 });
    }

    const availableTypes = await db.select().from(ticketTypes).where(eq(ticketTypes.eventId, eventId));
    let basePriceSum = 0;
    const validatedItems: Array<{ ticketTypeId: string; name: string; basePrice: number; quantity: number }> = [];

    for (const item of items) {
      const ticketType = availableTypes.find((entry) => entry.id === item.ticketTypeId);
      const quantity = Number(item.quantity);
      if (!ticketType || !Number.isInteger(quantity) || quantity <= 0) {
        return NextResponse.json({ error: "Entrada inválida" }, { status: 400 });
      }
      const basePrice = Number(ticketType.basePrice);
      basePriceSum += basePrice * quantity;
      validatedItems.push({ ticketTypeId: ticketType.id, name: ticketType.name, basePrice, quantity });
    }

    const fees = calculateFees(basePriceSum);
    const checkoutRows = await sql.query(
      "select * from create_checkout_order($1,$2::uuid,$3::jsonb,$4::numeric,$5::numeric,$6::numeric,$7::numeric,$8,now() + interval '10 minutes')",
      [session.user.id, eventId, JSON.stringify(validatedItems.map((item) => ({ ticket_type_id: item.ticketTypeId, quantity: item.quantity }))), fees.totalAmount, fees.serviceFeeAmount, fees.mpFeeAmount, fees.ancFeeAmount, session.user.email]
    ) as unknown as Array<{ order_id: string; reservation_id: string }>;
    const checkout = checkoutRows[0];
    if (!checkout) throw new Error("No se pudo crear la reserva de checkout");

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;
    try {
      const preference = await createMpPreference({
        organizerAccessToken: event.organizerAccessToken,
        items: validatedItems.map((item) => ({ title: `${event.eventTitle} — ${item.name}`, quantity: item.quantity, unit_price: calculateFees(item.basePrice).totalAmount })),
        marketplaceFee: fees.ancFeeAmount,
        externalReference: checkout.order_id,
        payerEmail: session.user.email,
        successUrl: `${siteUrl}/dashboard/tickets?order=${checkout.order_id}`,
        failureUrl: `${siteUrl}/events/${eventId}?checkout=failed`,
        pendingUrl: `${siteUrl}/dashboard/tickets?order=${checkout.order_id}`,
        notificationUrl: `${siteUrl}/api/webhooks/mercadopago`,
      });
      await sql.query("update orders set mp_preference_id = $1, updated_at = now() where id = $2::uuid", [preference.id, checkout.order_id]);
      return NextResponse.json({ initPoint: preference.init_point });
    } catch (error) {
      await sql.query("select cancel_checkout_order($1::uuid)", [checkout.order_id]);
      throw error;
    }
  } catch (error) {
    console.error("Checkout failed", error);
    return NextResponse.json({ error: "No se pudo iniciar el pago" }, { status: 500 });
  }

  /* Legacy Supabase path intentionally removed below. */
  /*
  if (!event || event.status !== "published") {
    return NextResponse.json({ error: "Evento no disponible" }, { status: 404 });
  }

  const { data: ticketTypes } = await supabase
    .from("ticket_types")
    .select("*")
    .eq("event_id", eventId)
    .returns<TicketType[]>();

  if (!ticketTypes) {
    return NextResponse.json({ error: "No hay entradas para este evento" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: mpAccount } = await admin
    .from("mp_accounts")
    .select("*")
    .eq("organizer_id", event.organizer_id)
    .single<MpAccount>();

  if (!mpAccount) {
    return NextResponse.json(
      { error: "El organizador no tiene Mercado Pago conectado" },
      { status: 400 }
    );
  }

  let basePriceSum = 0;
  const validatedItems: { ticketType: TicketType; quantity: number }[] = [];

  for (const item of items) {
    const ticketType = ticketTypes.find((tt) => tt.id === item.ticketTypeId);
    const quantity = Number(item.quantity);

    if (!ticketType || !Number.isInteger(quantity) || quantity <= 0) {
      return NextResponse.json({ error: "Entrada inválida" }, { status: 400 });
    }

    const remaining = ticketType.quantity - ticketType.sold_count;
    if (quantity > remaining) {
      return NextResponse.json(
        { error: `No hay suficiente stock de "${ticketType.name}"` },
        { status: 400 }
      );
    }

    basePriceSum += ticketType.base_price * quantity;
    validatedItems.push({ ticketType, quantity });
  }

  const fees = calculateFees(basePriceSum);

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      buyer_id: user.id,
      event_id: eventId,
      total_amount: fees.totalAmount,
      service_fee_amount: fees.serviceFeeAmount,
      mp_fee_amount: fees.mpFeeAmount,
      anc_fee_amount: fees.ancFeeAmount,
      status: "pending",
      buyer_email: user.email,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    return NextResponse.json(
      { error: orderError?.message ?? "No se pudo crear la orden" },
      { status: 500 }
    );
  }

  const { error: itemsError } = await admin.from("order_items").insert(
    validatedItems.map(({ ticketType, quantity }) => ({
      order_id: order.id,
      ticket_type_id: ticketType.id,
      quantity,
      unit_base_price: ticketType.base_price,
    }))
  );

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

  try {
    const preference = await createMpPreference({
      organizerAccessToken: mpAccount.access_token,
      items: validatedItems.map(({ ticketType, quantity }) => ({
        title: `${event.title} — ${ticketType.name}`,
        quantity,
        unit_price: calculateFees(ticketType.base_price).totalAmount,
      })),
      marketplaceFee: fees.ancFeeAmount,
      externalReference: order.id,
      payerEmail: user.email,
      successUrl: `${siteUrl}/dashboard/tickets?order=${order.id}`,
      failureUrl: `${siteUrl}/events/${eventId}?checkout=failed`,
      pendingUrl: `${siteUrl}/dashboard/tickets?order=${order.id}`,
      notificationUrl: `${siteUrl}/api/webhooks/mercadopago`,
    });

    await admin
      .from("orders")
      .update({ mp_preference_id: preference.id })
      .eq("id", order.id);

    return NextResponse.json({ initPoint: preference.init_point });
  } catch (err) {
    console.error("Error creando preferencia MP:", err);
    await admin.from("orders").update({ status: "cancelled" }).eq("id", order.id);
    return NextResponse.json(
      { error: "No se pudo iniciar el pago con Mercado Pago" },
      { status: 500 }
    );
  } */
}
