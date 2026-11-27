import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendDailySummaries } from "@/lib/email/deliver";

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

  // Deja constancia de la corrida para la pantalla de salud de /admin. Si falla no
  // se rompe el cron: solo se registra el error.
  const { error: statusError } = await admin.from("system_status").upsert(
    {
      key: "daily_cron",
      value: { ran_at: new Date().toISOString(), expired_orders: typeof expired === "number" ? expired : 0 },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
  if (statusError) console.error("system_status (daily_cron) falló:", statusError);

  // Resumen diario de ventas a las productoras que lo eligieron. Aislado: si falla no
  // cambia el resultado del cron (ya expiró reservas y tocó la base).
  let summaries: { sent: number; skipped: number; failed: number } | null = null;
  try {
    summaries = await sendDailySummaries(admin);
  } catch (err) {
    console.error("Resumen diario falló:", err instanceof Error ? err.message : "error");
  }

  return NextResponse.json({ ok: true, expired, summaries });
}
