import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Búsqueda manual de asistentes en la puerta (nombre, correo o código). Organizador y staff. */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const url = new URL(request.url);
  const eventId = url.searchParams.get("eventId") ?? "";
  const q = (url.searchParams.get("q") ?? "").trim();

  if (!UUID_RE.test(eventId)) {
    return NextResponse.json({ error: "Evento inválido" }, { status: 400 });
  }
  if (q.length < 2) return NextResponse.json({ results: [] });

  const admin = createAdminClient();
  const { data: allowed } = await admin.rpc("can_scan_event", { p_event_id: eventId, p_user_id: user.id });
  if (!allowed) return NextResponse.json({ error: "No tienes acceso a este evento" }, { status: 403 });

  let query = admin
    .from("tickets")
    .select("qr_code, status, used_at, holder_name, holder_email, ticket_types(name)")
    .eq("event_id", eventId)
    .order("holder_name", { ascending: true })
    .limit(20);

  if (UUID_RE.test(q)) {
    query = query.eq("qr_code", q.toLowerCase());
  } else {
    // Se quitan los caracteres que tienen significado en filtros PostgREST / LIKE.
    const term = q.replace(/[%,()*\\_]/g, " ").trim();
    query = query.or(`holder_name.ilike.%${term}%,holder_email.ilike.%${term}%`);
  }

  const { data, error } = await query.returns<
    {
      qr_code: string;
      status: string;
      used_at: string | null;
      holder_name: string | null;
      holder_email: string | null;
      ticket_types: { name: string } | null;
    }[]
  >();

  if (error) {
    console.error("Búsqueda de tickets falló:", error);
    return NextResponse.json({ error: "No se pudo buscar" }, { status: 500 });
  }

  return NextResponse.json({
    results: (data ?? []).map((t) => ({
      qrCode: t.qr_code,
      status: t.status,
      usedAt: t.used_at,
      holderName: t.holder_name,
      holderEmail: t.holder_email,
      ticketType: t.ticket_types?.name ?? null,
    })),
  });
}
