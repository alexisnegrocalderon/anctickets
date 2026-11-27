"use server";

import { redirect } from "next/navigation";
import { createClient as createEphemeralClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin-core";
import { safeNextPath } from "@/lib/safe-redirect";
import { failureDelay, getThrottleKeys, isBlocked, recordAttempt } from "@/lib/team-throttle-store";

/**
 * Acceso del administrador con correo + clave + código de 6 dígitos, TODO en
 * una sola petición. Una server action es un endpoint público: se valida todo.
 *
 * Diseño clave: la clave y el código se comprueban con un cliente EFÍMERO
 * (sin cookies ni almacenamiento). El navegador solo recibe cookies de sesión
 * cuando TODO pasó, y ya con la sesión en aal2 (clave + código). Si algo falla
 * se revoca la sesión recién creada en Supabase (signOut local) y no se emite
 * ninguna cookie: ni siquiera existe un token aal1 que pudiera filtrarse.
 */

export type TeamActionState = { error?: string } | null;

const GENERIC_ERROR = "Correo, clave o código incorrectos, o acceso no habilitado.";
const NO_FACTOR_ERROR = "Primero activa la verificación en 2 pasos entrando con Google, desde Cuenta.";
const MAX_EMAIL = 254;
const MAX_PASSWORD = 200;
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signInTeam(email: unknown, password: unknown, code: unknown, next: unknown): Promise<TeamActionState> {
  const target = safeNextPath(typeof next === "string" ? next : null, "/admin");

  if (typeof email !== "string" || typeof password !== "string" || typeof code !== "string") {
    await failureDelay();
    return { error: GENERIC_ERROR };
  }
  const mail = email.trim().toLowerCase();
  // (a) formatos y largos
  if (!mail || mail.length > MAX_EMAIL || !EMAIL_SHAPE.test(mail) || !password || password.length > MAX_PASSWORD || code.length > 32) {
    await failureDelay();
    return { error: GENERIC_ERROR };
  }

  // (b) limitador de intentos
  const keys = await getThrottleKeys(mail);
  if (await isBlocked(keys)) {
    await failureDelay();
    return { error: GENERIC_ERROR };
  }

  const ephemeral = createEphemeralClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  /** Cualquier fallo: revoca la sesión creada (si la hubo), cuenta el intento y responde. */
  async function fail(message: string, hadSession: boolean) {
    if (hadSession) await ephemeral.auth.signOut({ scope: "local" }).catch(() => undefined);
    await recordAttempt(keys, false);
    await failureDelay();
    return { error: message };
  }

  // (c) clave
  const { data: signedIn, error: signInError } = await ephemeral.auth.signInWithPassword({ email: mail, password });
  if (signInError || !signedIn?.user) return fail(GENERIC_ERROR, false);

  // (d) debe ser admin y tener un factor TOTP verificado
  if (!isAdminUser(signedIn.user)) return fail(GENERIC_ERROR, true);
  const { data: factors, error: factorsError } = await ephemeral.auth.mfa.listFactors();
  if (factorsError || !factors) return fail(GENERIC_ERROR, true);
  const factor = factors.totp[0];
  // La clave era correcta: ya demostró conocerla, se le dice qué falta (cuenta como intento).
  if (!factor) return fail(NO_FACTOR_ERROR, true);

  // (e) código de 6 dígitos
  const clean = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(clean)) return fail(GENERIC_ERROR, true);
  const { data: verified, error: verifyError } = await ephemeral.auth.mfa.challengeAndVerify({ factorId: factor.id, code: clean });
  if (verifyError || !verified?.access_token || !verified.refresh_token) return fail(GENERIC_ERROR, true);

  // Todo pasó: recién ahora el navegador recibe la sesión (aal2).
  const supabase = await getSupabase();
  const { error: setError } = await supabase.auth.setSession({
    access_token: verified.access_token,
    refresh_token: verified.refresh_token,
  });
  if (setError) {
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    return fail(GENERIC_ERROR, true);
  }

  await recordAttempt(keys, true);
  redirect(target);
}
