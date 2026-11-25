"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deliverOrderEmail } from "@/lib/orders";
import type { Order } from "@/lib/database.types";

export interface ResendResult {
  ok: boolean;
  message: string;
}

/**
 * Reenvía el correo con las entradas. Lo puede pedir el comprador (por
 * `buyer_id` o por el correo de su cuenta) o el productor dueño del evento.
 */
export async function resendOrderEmail(orderId: string): Promise<ResendResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Debes iniciar sesión" };

  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle<Order>();
  if (!order) return { ok: false, message: "Orden no encontrada" };

  const isBuyer =
    order.buyer_id === user.id ||
    (!!user.email && order.buyer_email.toLowerCase() === user.email.toLowerCase());

  let isOrganizer = false;
  if (!isBuyer) {
    const { data: event } = await admin
      .from("events")
      .select("organizer_id")
      .eq("id", order.event_id)
      .maybeSingle<{ organizer_id: string }>();
    isOrganizer = event?.organizer_id === user.id;
  }

  if (!isBuyer && !isOrganizer) return { ok: false, message: "No tienes acceso a esta orden" };
  if (order.status !== "approved") return { ok: false, message: "La orden aún no está confirmada" };

  // Freno simple contra spam: un reenvío por minuto y orden.
  if (order.email_sent_at && Date.now() - new Date(order.email_sent_at).getTime() < 60_000) {
    return { ok: false, message: "Acabamos de enviar el correo. Espera un minuto e intenta de nuevo." };
  }

  const sent = await deliverOrderEmail(admin, orderId, { force: true });
  return sent
    ? { ok: true, message: `Enviamos tus entradas a ${order.buyer_email}` }
    : { ok: false, message: "No pudimos enviar el correo. Intenta de nuevo en unos minutos." };
}
