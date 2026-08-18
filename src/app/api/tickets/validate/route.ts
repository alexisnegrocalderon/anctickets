import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { TicketStatus } from "@/lib/database.types";

interface TicketWithRelations {
  id: string;
  status: TicketStatus;
  ticket_types: { name: string } | null;
  orders: { events: { title: string } | null } | null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const qrCode = String(body.qrCode ?? "").trim();

  if (!qrCode) {
    return NextResponse.json({ error: "Código QR faltante" }, { status: 400 });
  }

  // RLS garantiza que solo el organizador dueño del evento pueda ver/actualizar.
  const { data: ticket, error: fetchError } = await supabase
    .from("tickets")
    .select("id, status, ticket_types(name), orders(events(title))")
    .eq("qr_code", qrCode)
    .maybeSingle<TicketWithRelations>();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!ticket) {
    return NextResponse.json(
      { valid: false, message: "Entrada no encontrada o no autorizada" },
      { status: 404 }
    );
  }

  if (ticket.status === "used") {
    return NextResponse.json({
      valid: false,
      message: "Esta entrada ya fue utilizada",
      ticket,
    });
  }

  if (ticket.status === "cancelled") {
    return NextResponse.json({
      valid: false,
      message: "Esta entrada fue cancelada",
      ticket,
    });
  }

  const { error: updateError } = await supabase
    .from("tickets")
    .update({ status: "used", used_at: new Date().toISOString() })
    .eq("id", ticket.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    valid: true,
    message: "Entrada válida — acceso permitido",
    ticket,
  });
}
