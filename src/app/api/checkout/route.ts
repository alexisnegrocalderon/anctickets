import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateFees } from "@/lib/fees";
import { createMpPreference, refreshMpOAuthToken } from "@/lib/mercadopago";
import type { Event, MpAccount, TicketType } from "@/lib/database.types";

interface CheckoutItemInput {
  ticketTypeId: string;
  quantity: number;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 });
  }

  const body = await request.json();
  const eventId = String(body.eventId ?? "");
  const items: CheckoutItemInput[] = Array.isArray(body.items) ? body.items : [];

  if (!eventId || items.length === 0) {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single<Event>();

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

  let organizerAccessToken = mpAccount.access_token;

  if (mpAccount.refresh_token && mpAccount.expires_at) {
    const expiresAt = new Date(mpAccount.expires_at).getTime();
    const isExpiringSoon = expiresAt - Date.now() < 5 * 60 * 1000;

    if (isExpiringSoon) {
      try {
        const refreshed = await refreshMpOAuthToken(mpAccount.refresh_token);
        organizerAccessToken = refreshed.access_token;

        await admin
          .from("mp_accounts")
          .update({
            access_token: refreshed.access_token,
            refresh_token: refreshed.refresh_token,
            expires_at: new Date(
              Date.now() + refreshed.expires_in * 1000
            ).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("organizer_id", event.organizer_id);
      } catch (err) {
        console.error("Error renovando token de Mercado Pago:", err);
        return NextResponse.json(
          { error: "La conexión de Mercado Pago del organizador expiró. Debe reconectarla." },
          { status: 400 }
        );
      }
    }
  }

  let basePriceSum = 0;
  const validatedItems: { ticketType: TicketType; quantity: number }[] = [];
  const now = Date.now();

  for (const item of items) {
    const ticketType = ticketTypes.find((tt) => tt.id === item.ticketTypeId);
    const quantity = Number(item.quantity);

    if (!ticketType || !Number.isInteger(quantity) || quantity <= 0) {
      return NextResponse.json({ error: "Entrada inválida" }, { status: 400 });
    }

    if (ticketType.sales_start && now < new Date(ticketType.sales_start).getTime()) {
      return NextResponse.json(
        { error: `La venta de "${ticketType.name}" aún no comienza` },
        { status: 400 }
      );
    }

    if (ticketType.sales_end && now > new Date(ticketType.sales_end).getTime()) {
      return NextResponse.json(
        { error: `La venta de "${ticketType.name}" ya finalizó` },
        { status: 400 }
      );
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
      organizerAccessToken,
      items: validatedItems.map(({ ticketType, quantity }) => ({
        title: `${event.title} — ${ticketType.name}`,
        quantity,
        unit_price: calculateFees(ticketType.base_price).totalAmount,
      })),
      marketplaceFee: fees.ancFeeAmount,
      externalReference: order.id,
      payerEmail: user.email,
      successUrl: `${siteUrl}/dashboard/tickets?order=${order.id}`,
      failureUrl: `${siteUrl}/${event.slug}?checkout=failed`,
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
  }
}
