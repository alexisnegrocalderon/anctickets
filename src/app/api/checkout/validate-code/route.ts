import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildQuote, CheckoutError, type CheckoutItemInput } from "@/lib/checkout";

/** Vista previa de un código de descuento en el formulario de compra. No reserva nada. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ valid: false, message: "Inicia sesión para usar un código" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ valid: false, message: "Solicitud inválida" }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code : "";
  if (!code.trim()) {
    return NextResponse.json({ valid: false, message: "Escribe un código" }, { status: 400 });
  }

  try {
    const quote = await buildQuote(createAdminClient(), {
      eventId: String(body.eventId ?? ""),
      items: Array.isArray(body.items) ? (body.items as CheckoutItemInput[]) : [],
      discountCode: code,
    });
    const p = quote.priced;
    return NextResponse.json({
      valid: true,
      discountTotal: p.discountTotal,
      baseTotal: p.baseTotal,
      serviceFeeAmount: p.serviceFeeAmount,
      totalAmount: p.totalAmount,
    });
  } catch (err) {
    if (err instanceof CheckoutError) {
      return NextResponse.json({ valid: false, message: err.message }, { status: 200 });
    }
    console.error("validate-code falló:", err);
    return NextResponse.json({ valid: false, message: "No se pudo validar el código" }, { status: 500 });
  }
}
