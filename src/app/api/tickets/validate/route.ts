import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { assertDatabaseConfigured, sql } from "@/lib/db";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const qrCode = String(body.qrCode ?? "").trim();
  const eventId = String(body.eventId ?? "").trim();

  if (!uuidPattern.test(qrCode) || !uuidPattern.test(eventId)) {
    return NextResponse.json({ error: "Código QR o evento inválido" }, { status: 400 });
  }

  try {
    assertDatabaseConfigured();
    const result = await sql.query(
      "select * from validate_ticket_checkin($1::uuid, $2::uuid, $3)",
      [qrCode, eventId, session.user.id]
    ) as unknown as Array<{ result: "accepted" | "already_used" | "not_found"; ticket_id: string | null }>;
    const checkin = result[0];

    if (!checkin || checkin.result === "not_found") {
      return NextResponse.json({ valid: false, message: "Entrada no encontrada para este evento" }, { status: 404 });
    }
    if (checkin.result === "already_used") {
      return NextResponse.json({ valid: false, message: "Esta entrada ya fue utilizada", ticketId: checkin.ticket_id });
    }
    return NextResponse.json({ valid: true, message: "Entrada válida — acceso permitido", ticketId: checkin.ticket_id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo validar la entrada";
    if (message.includes("staff_not_authorized")) {
      return NextResponse.json({ valid: false, message: "Tu cuenta no tiene permiso de puerta para este evento" }, { status: 403 });
    }
    console.error("Ticket validation failed", error);
    return NextResponse.json({ error: "No se pudo validar la entrada" }, { status: 500 });
  }
}
