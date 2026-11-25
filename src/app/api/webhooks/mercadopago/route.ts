import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMpPayment, MpApiError, verifyMpWebhookSignature, type MpPayment } from "@/lib/mercadopago";
import {
  getFreshSellerToken,
  getMpAccountByMpUserId,
  getMpAccountByOrganizer,
} from "@/lib/mp-accounts";
import { deliverOrderEmail } from "@/lib/orders";
import type { Event, Order } from "@/lib/database.types";

const ok = () => NextResponse.json({ received: true });

/**
 * Webhook de Mercado Pago. Diseñado para ser idempotente: MP puede mandar la
 * misma notificación varias veces y en paralelo; toda la lógica que cambia
 * estado vive en funciones SQL atómicas (approve_order, fail_order,
 * revert_order). Errores transitorios devuelven 500 para que MP reintente;
 * los permanentes (orden desconocida, monto distinto) se registran y devuelven 200.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  let body: { data?: { id?: string | number }; type?: string; user_id?: string | number } = {};
  try {
    body = await request.json();
  } catch {
    // sin body JSON: seguimos con los query params
  }

  const paymentId = url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? body?.data?.id ?? null;
  const type = url.searchParams.get("type") ?? url.searchParams.get("topic") ?? body?.type ?? null;

  if (type && type !== "payment") return ok();
  if (!paymentId) {
    return NextResponse.json({ error: "missing payment id" }, { status: 400 });
  }

  const isValidSignature = verifyMpWebhookSignature({
    xSignature: request.headers.get("x-signature"),
    xRequestId: request.headers.get("x-request-id"),
    dataId: String(paymentId),
  });
  if (!isValidSignature) {
    console.error("Firma inválida en webhook de Mercado Pago");
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const admin = createAdminClient();

  try {
    // 1. Traer el pago con el token del VENDEDOR (el pago vive en su cuenta).
    const tokens: string[] = [];
    const sellerUserId = body?.user_id !== undefined ? String(body.user_id) : null;
    if (sellerUserId) {
      const account = await getMpAccountByMpUserId(admin, sellerUserId);
      if (account) tokens.push(await getFreshSellerToken(admin, account));
    }
    if (process.env.MP_ANC_ACCESS_TOKEN) tokens.push(process.env.MP_ANC_ACCESS_TOKEN);

    let payment: MpPayment | null = null;
    for (const token of tokens) {
      try {
        payment = await getMpPayment(String(paymentId), token);
        break;
      } catch (err) {
        // 5xx: error transitorio, que MP reintente. 4xx: probar con el siguiente token.
        if (!(err instanceof MpApiError) || err.status >= 500 || err.status === 429) throw err;
      }
    }

    if (!payment) {
      console.error(`Webhook MP: no se pudo consultar el pago ${paymentId} con ningún token disponible`);
      return ok();
    }

    const orderId = payment.external_reference;
    if (!orderId) {
      console.error(`Webhook MP: pago ${paymentId} sin external_reference`);
      return ok();
    }

    const { data: order } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle<Order>();
    if (!order) {
      console.error(`Webhook MP: orden ${orderId} no existe (pago ${paymentId})`);
      return ok();
    }
    if (order.kind !== "sale") return ok();

    // 2. Verificar monto y vendedor antes de cambiar nada.
    if (Math.abs(Number(payment.transaction_amount) - Number(order.total_amount)) > 1) {
      console.error(
        `Webhook MP: monto distinto en orden ${orderId}: pago ${payment.transaction_amount} vs orden ${order.total_amount}`
      );
      return ok();
    }

    const { data: event } = await admin
      .from("events")
      .select("organizer_id")
      .eq("id", order.event_id)
      .single<Pick<Event, "organizer_id">>();
    const organizerAccount = event ? await getMpAccountByOrganizer(admin, event.organizer_id) : null;
    if (
      organizerAccount &&
      payment.collector_id !== undefined &&
      payment.collector_id !== null &&
      String(payment.collector_id) !== organizerAccount.mp_user_id
    ) {
      console.error(
        `Webhook MP: vendedor distinto en orden ${orderId}: pago ${payment.collector_id} vs ${organizerAccount.mp_user_id}`
      );
      return ok();
    }

    // 3. Aplicar el estado.
    switch (payment.status) {
      case "approved": {
        const { data: result, error } = await admin.rpc("approve_order", {
          p_order_id: orderId,
          p_payment_id: String(payment.id),
        });
        if (error) throw new Error(error.message);
        if (result?.overbooked) {
          console.error(`Orden ${orderId} aprobada con sobreventa: coordinar reembolso con el productor`);
        }
        break;
      }
      case "rejected":
      case "cancelled": {
        const { error } = await admin.rpc("fail_order", {
          p_order_id: orderId,
          p_new_status: payment.status,
        });
        if (error) throw new Error(error.message);
        break;
      }
      case "refunded":
      case "charged_back": {
        const { error } = await admin.rpc("revert_order", {
          p_order_id: orderId,
          p_new_status: payment.status,
        });
        if (error) throw new Error(error.message);
        break;
      }
      default:
        // pending / in_process / authorized: se espera otra notificación.
        break;
    }

    // 4. Correo: si la orden está aprobada y nunca se envió (p. ej. falló Resend
    // en una notificación anterior), se intenta de nuevo. Un fallo NO hace
    // fallar el webhook: queda email_sent_at en null y hay botón "Reenviar".
    if (payment.status === "approved") {
      const { data: fresh } = await admin
        .from("orders")
        .select("email_sent_at, status")
        .eq("id", orderId)
        .single<Pick<Order, "email_sent_at" | "status">>();
      if (fresh?.status === "approved" && !fresh.email_sent_at) {
        await deliverOrderEmail(admin, orderId);
      }
    }

    return ok();
  } catch (err) {
    console.error("Error procesando webhook de Mercado Pago:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
