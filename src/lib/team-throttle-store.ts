import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  FAILURE_DELAY_MS,
  WINDOW_MS,
  clientIpFromHeaders,
  hashIdentifier,
  isLockedOut,
  type Attempt,
} from "@/lib/team-throttle";

/**
 * Lectura/escritura del limitador en admin_login_attempts (solo service_role).
 * Si la tabla aún no existe (migración sin aplicar) o la base falla, el
 * limitador se degrada a "sin registro": no bloquea ni rompe el ingreso. Los
 * límites propios de Supabase Auth siguen vigentes pase lo que pase.
 */

export type ThrottleKeys = { emailHash: string; ipHash: string };

function salt(): string | null {
  return process.env.LOGIN_HASH_SALT || process.env.CRON_SECRET || null;
}

export async function getThrottleKeys(email: string): Promise<ThrottleKeys | null> {
  const s = salt();
  if (!s) return null; // sin sal no se guarda nada (no se hashea con una sal conocida)
  const h = await headers();
  return {
    emailHash: hashIdentifier("email", email, s),
    ipHash: hashIdentifier("ip", clientIpFromHeaders((n) => h.get(n)), s),
  };
}

export async function isBlocked(keys: ThrottleKeys | null): Promise<boolean> {
  if (!keys) return false;
  try {
    const since = new Date(Date.now() - WINDOW_MS).toISOString();
    const { data, error } = await createAdminClient()
      .from("admin_login_attempts")
      .select("email_hash, ip_hash, ok, created_at")
      .eq("ok", false)
      .gte("created_at", since)
      .or(`email_hash.eq.${keys.emailHash},ip_hash.eq.${keys.ipHash}`)
      .limit(200);
    if (error || !data) return false;
    return isLockedOut(data as Attempt[], keys);
  } catch {
    return false;
  }
}

export async function recordAttempt(keys: ThrottleKeys | null, ok: boolean): Promise<void> {
  if (!keys) return;
  try {
    const { error } = await createAdminClient()
      .from("admin_login_attempts")
      .insert({ email_hash: keys.emailHash, ip_hash: keys.ipHash, ok });
    if (error) console.error("admin_login_attempts: no se pudo registrar el intento");
  } catch {
    console.error("admin_login_attempts: no se pudo registrar el intento");
  }
}

/** Espera artificial tras un fallo. */
export function failureDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, FAILURE_DELAY_MS));
}
