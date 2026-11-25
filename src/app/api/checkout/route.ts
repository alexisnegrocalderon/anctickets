import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateFees } from "@/lib/fees";
import { createMpPreference } from "@/lib/mercadopago";
import { getFreshSellerToken, getMpAccountByOrganizer } from "@/lib/mp-accounts";
import {
  buildQuote,
  CheckoutError,
  friendlyRpcError,
  orderRpcArgs,
  type CheckoutItemInput,
} from "@/lib/checkout";
import { deliverOrderEmail } from "@/lib/orders";
import { AMBASSADOR_COOKIE, siteUrl } from "@/lib/site";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const eventId = String(body.eventId ?? "");
  const items: CheckoutItemInput[] = Array.isArray(body.items) ? (body.items as CheckoutItemInput[]) : [];
  const cookieStore = await cookies();
  const ambassadorCode =
    (typeof body.ambassadorCode === "string" && body.ambassadorCode) ||
    cookieStore.get(AMBASSADOR_COOKIE)?.value ||
    null;

  const admin = createAdminClient();

  try {
    const quote = await buildQuote(admin, {
      eventId,
      items,
      discountCode: typeof body.discountCode === "string" ? body.discountCode : null,
      ambassadorCode,
    });
    const { event, priced } = quote;
    const site = siteUrl();

    // Para cobrar necesitamos el token del vendedor ANTES de reservar stock.
    let sellerToken: string | null = null;
    if (!priced.isFree) {
      const account = await getMpAccountByOrganizer(admin, event.organizer_id);
      if (!account) {
        throw new CheckoutError("El organizador no tiene Mercado Pago conectado");
      }
      try {
        sellerToken = await getFreshSellerToken(admin, account);
      } catch (err) {
        console.error("Error renovando token de Mercado Pago:", err);
        throw new CheckoutError("La conexión de Mercado Pago del organizador expiró. Debe reconectarla.");
      }
    }

    const kind = priced.isFree ? "free" : "sale";
    const { data: orderId, error: rpcError } = await admin.rpc(
      "create_pending_order",
      orderRpcArgs(quote, { id: user.id, email: user.email }, kind)
    );

    if (rpcError || !orderId) {
      const friendly = rpcError ? friendlyRpcError(rpcError.message, quote.ticketTypes) : null;
      if (friendly) throw friendly;
      console.error("create_pending_order falló:", rpcError);
      throw new CheckoutError("No se pudo crear la orden", 500);
    }

    // Camino gratis: sin Mercado Pago, se aprueba y se emiten las entradas de inmediato.
    if (priced.isFree) {
      const { error: approveError } = await admin.rpc("approve_order", {
        p_order_id: orderId,
        p_payment_id: null,
      });
      if (approveError) {
        console.error("approve_order (gratis) falló:", approveError);
        await admin.rpc("fail_order", { p_order_id: orderId, p_new_status: "cancelled" });
        throw new CheckoutError("No se pudo confirmar tu inscripción. Intenta de nuevo.", 500);
      }
      await deliverOrderEmail(admin, orderId);
      return NextResponse.json({ redirectUrl: `${site}/mis-entradas?order=${orderId}` });
    }

    const { data: orderRow } = await admin.from("orders").select("reserved_until").eq("id", orderId).single();

    try {
      const preference = await createMpPreference({
        organizerAccessToken: sellerToken!,
        // Los ítems de $0 no se mandan a MP (rechaza unit_price 0); el total cobrado es el mismo.
        items: priced.lines
          .filter((l) => l.unitFinalPrice > 0)
          .map((l) => ({
            title: `${event.title} — ${quote.ticketTypes.get(l.ticketTypeId)!.name}`,
            quantity: l.quantity,
            unit_price: calculateFees(l.unitFinalPrice).totalAmount,
            currency_id: "CLP",
          })),
        marketplaceFee: priced.ancFeeAmount,
        externalReference: orderId,
        payerEmail: user.email,
        successUrl: `${site}/mis-entradas?order=${orderId}`,
        failureUrl: `${site}/${event.slug}?checkout=failed`,
        pendingUrl: `${site}/mis-entradas?order=${orderId}`,
        notificationUrl: `${site}/api/webhooks/mercadopago`,
        expirationDateTo: orderRow?.reserved_until ?? undefined,
      });

      await admin.from("orders").update({ mp_preference_id: preference.id }).eq("id", orderId);
      return NextResponse.json({ initPoint: preference.init_point });
    } catch (err) {
      console.error("Error creando preferencia MP:", err);
      await admin.rpc("fail_order", { p_order_id: orderId, p_new_status: "cancelled" });
      throw new CheckoutError("No se pudo iniciar el pago con Mercado Pago", 502);
    }
  } catch (err) {
    if (err instanceof CheckoutError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error en checkout:", err);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}
