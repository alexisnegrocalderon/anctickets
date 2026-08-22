import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Event } from "@/lib/database.types";

interface OrderRow {
  id: string;
  buyer_email: string;
  total_amount: number;
  created_at: string;
  order_items: { quantity: number; ticket_types: { name: string } | null }[];
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

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

  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      "id, buyer_email, total_amount, created_at, order_items(quantity, ticket_types(name))"
    )
    .eq("event_id", eventId)
    .eq("status", "approved")
    .order("created_at", { ascending: true })
    .returns<OrderRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const header = ["Email comprador", "Entradas", "Total pagado", "Fecha de compra"];
  const rows = (orders ?? []).map((order) => {
    const items = order.order_items
      .map((item) => `${item.quantity}x ${item.ticket_types?.name ?? "Entrada"}`)
      .join(" + ");

    return [
      csvEscape(order.buyer_email),
      csvEscape(items),
      order.total_amount.toString(),
      new Date(order.created_at).toISOString(),
    ].join(",");
  });

  const csv = [header.join(","), ...rows].join("\n");
  const filename = `compradores-${event.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
