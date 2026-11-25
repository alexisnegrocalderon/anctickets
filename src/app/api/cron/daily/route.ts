import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Cron diario (ver vercel.json). Vercel lo llama con
 * `Authorization: Bearer ${CRON_SECRET}`. Expira reservas vencidas y toca la
 * base para que el proyecto gratuito de Supabase no se pause.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: expired, error: expireError } = await admin.rpc("expire_stale_orders");
  if (expireError) {
    console.error("expire_stale_orders falló:", expireError);
    return NextResponse.json({ error: expireError.message }, { status: 500 });
  }

  const { error: aliveError } = await admin.rpc("keep_alive");
  if (aliveError) {
    console.error("keep_alive falló:", aliveError);
    return NextResponse.json({ error: aliveError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, expired });
}
