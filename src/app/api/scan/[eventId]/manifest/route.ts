import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE = 1000;
const NO_STORE = { "Cache-Control": "no-store" };

type Row = {
  qr_code: string;
  status: string;
  holder_name: string | null;
  used_at: string | null;
  ticket_types: { name: string } | null;
};

/**
 * Lista de entradas del evento para validar sin conexión. Nunca incluye el QR
 * crudo: solo su SHA-256 en hex. Organizador y staff de puerta.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401, headers: NO_STORE });

  if (!UUID_RE.test(eventId)) {
    return NextResponse.json({ error: "Evento inválido" }, { status: 400, headers: NO_STORE });
  }

  const admin = createAdminClient();
  const { data: allowed } = await admin.rpc("can_scan_event", { p_event_id: eventId, p_user_id: user.id });
  if (!allowed) {
    return NextResponse.json({ error: "No tienes acceso a este evento" }, { status: 403, headers: NO_STORE });
  }

  const entries: { h: string; s: string; n: string | null; t: string | null; u: string | null }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from("tickets")
      .select("qr_code, status, holder_name, used_at, ticket_types(name)")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1)
      .returns<Row[]>();

    if (error) {
      console.error("Manifiesto de escáner falló:", error);
      return NextResponse.json({ error: "No se pudo descargar la lista" }, { status: 500, headers: NO_STORE });
    }

    for (const t of data ?? []) {
      entries.push({
        h: createHash("sha256").update(String(t.qr_code).trim().toLowerCase()).digest("hex"),
        s: t.status,
        n: t.holder_name,
        t: t.ticket_types?.name ?? null,
        u: t.used_at,
      });
    }
    if (!data || data.length < PAGE) break;
  }

  return NextResponse.json(
    { eventId, generatedAt: new Date().toISOString(), entries },
    { headers: NO_STORE }
  );
}
