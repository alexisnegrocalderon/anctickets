import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Check-in de una entrada. El organizador y el staff de puerta del evento
 * pueden usarlo; la autorización y la marca de "usada" ocurren juntas dentro
 * de la función SQL check_in_ticket (atómica, sin carreras de doble ingreso).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const qr = String(body.qr ?? "").trim();
  const eventId = String(body.eventId ?? "");

  if (!qr || qr.length > 200) {
    return NextResponse.json({ error: "Código QR faltante" }, { status: 400 });
  }
  if (!UUID_RE.test(eventId)) {
    return NextResponse.json({ error: "Evento inválido" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("check_in_ticket", {
    p_qr: qr,
    p_event_id: eventId,
    p_user_id: user.id,
  });

  if (error || !data) {
    console.error("check_in_ticket falló:", error);
    return NextResponse.json({ error: "No se pudo validar la entrada" }, { status: 500 });
  }

  if (data.result === "forbidden") {
    return NextResponse.json({ error: "No tienes acceso a este evento" }, { status: 403 });
  }

  return NextResponse.json(data);
}
