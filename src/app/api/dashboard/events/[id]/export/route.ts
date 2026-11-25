import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { csvRow } from "@/lib/csv";
import type { Event } from "@/lib/database.types";

interface TicketRow {
  qr_code: string;
  status: string;
  used_at: string | null;
  holder_name: string | null;
  holder_email: string | null;
  ticket_types: { name: string } | null;
  orders: {
    id: string;
    status: string;
    kind: string;
    buyer_email: string;
    created_at: string;
    discount_codes: { code: string } | null;
    ambassadors: { name: string } | null;
  } | null;
}

const PAGE_SIZE = 1000;

const KIND_LABEL: Record<string, string> = { sale: "Venta", free: "Gratis", courtesy: "Cortesía" };
const STATUS_LABEL: Record<string, string> = { valid: "Válida", used: "Ingresó", cancelled: "Anulada" };

function santiago(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es-CL", { timeZone: "America/Santiago", hourCycle: "h23" });
}

/** CSV de asistentes: una fila por entrada emitida (solo el productor dueño del evento). */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single<Event>();

  if (!event || event.organizer_id !== user.id) {
    return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
  }

  const rows: TicketRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("tickets")
      .select(
        "qr_code, status, used_at, holder_name, holder_email, ticket_types(name), orders!inner(id, status, kind, buyer_email, created_at, discount_codes(code), ambassadors(name))"
      )
      .eq("event_id", eventId)
      .in("orders.status", ["approved", "refunded", "charged_back"])
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
      .returns<TicketRow[]>();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }

  const header = csvRow([
    "Entrada",
    "Titular",
    "Correo titular",
    "Correo comprador",
    "Tipo de orden",
    "Estado de la orden",
    "Código de descuento",
    "Embajador",
    "Estado de la entrada",
    "Ingresó a las",
    "Fecha de compra",
    "Código QR",
  ]);

  const lines = rows.map((t) =>
    csvRow([
      t.ticket_types?.name ?? "",
      t.holder_name,
      t.holder_email,
      t.orders?.buyer_email,
      KIND_LABEL[t.orders?.kind ?? ""] ?? t.orders?.kind,
      t.orders?.status,
      t.orders?.discount_codes?.code,
      t.orders?.ambassadors?.name,
      STATUS_LABEL[t.status] ?? t.status,
      santiago(t.used_at),
      santiago(t.orders?.created_at ?? null),
      t.qr_code,
    ])
  );

  // BOM para que Excel abra bien las tildes.
  const csv = "﻿" + [header, ...lines].join("\n");
  const filename = `asistentes-${event.slug}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
