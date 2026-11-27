"use server";

import { redirect } from "next/navigation";
import { getSupabase } from "@/lib/auth";
import { getSessionAssurance, isAdminUser } from "@/lib/admin";
import { safeNextPath } from "@/lib/safe-redirect";
import { failureDelay, getThrottleKeys, isBlocked, recordAttempt } from "@/lib/team-throttle-store";

/**
 * Acceso del administrador con correo + clave + código de 6 dígitos.
 * Una server action es un endpoint público: cada paso valida todo de nuevo.
 * Los mensajes de error son genéricos a propósito: no revelan si el correo
 * existe, si tiene clave o si es administrador.
 */

export type TeamActionState = { error?: string } | null;

const GENERIC_ERROR = "Correo o clave incorrectos, o acceso no habilitado.";
const NO_FACTOR_ERROR = "Primero activa la verificación en 2 pasos entrando con Google, desde Cuenta.";
const CODE_ERROR = "Código incorrecto o vencido";
const LOCKED_CODE_ERROR = "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
const MAX_EMAIL = 254;
const MAX_PASSWORD = 200;
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function nextOrAdmin(next: string | null | undefined): string {
  return safeNextPath(next, "/admin");
}

async function fail(keys: Awaited<ReturnType<typeof getThrottleKeys>>, message: string): Promise<{ error: string }> {
  await recordAttempt(keys, false);
  await failureDelay();
  return { error: message };
}

export async function signInTeam(email: unknown, password: unknown, next: unknown): Promise<TeamActionState> {
  const target = nextOrAdmin(typeof next === "string" ? next : null);

  if (typeof email !== "string" || typeof password !== "string") {
    await failureDelay();
    return { error: GENERIC_ERROR };
  }
  const mail = email.trim().toLowerCase();
  if (!mail || mail.length > MAX_EMAIL || !EMAIL_SHAPE.test(mail) || !password || password.length > MAX_PASSWORD) {
    await failureDelay();
    return { error: GENERIC_ERROR };
  }

  const keys = await getThrottleKeys(mail);
  if (await isBlocked(keys)) {
    await failureDelay();
    return { error: GENERIC_ERROR };
  }

  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email: mail, password });
  if (error || !data?.user) return fail(keys, GENERIC_ERROR);

  // Solo los administradores entran por aquí. Se cierra SOLO esta sesión
  // (scope local) para no sacar a nadie de sus otros dispositivos.
  if (!isAdminUser(data.user)) {
    await supabase.auth.signOut({ scope: "local" });
    return fail(keys, GENERIC_ERROR);
  }

  const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
  if (factorsError || !factors) {
    await supabase.auth.signOut({ scope: "local" });
    return fail(keys, GENERIC_ERROR);
  }

  if (factors.totp.length === 0) {
    // La clave era correcta: ya demostró conocerla, se le dice qué falta.
    await supabase.auth.signOut({ scope: "local" });
    await recordAttempt(keys, true);
    return { error: NO_FACTOR_ERROR };
  }

  await recordAttempt(keys, true);
  redirect(`/acceso-equipo/verificar?next=${encodeURIComponent(target)}`);
}

export async function verifyTeamCode(code: unknown, next: unknown): Promise<TeamActionState> {
  const target = nextOrAdmin(typeof next === "string" ? next : null);
  const supabase = await getSupabase();

  // Exige una sesión viva de un administrador verificado (getUser consulta a Auth).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminUser(user)) redirect("/acceso-equipo");

  // Si la sesión ya es Google o ya pasó el código, no hay nada que verificar.
  const { amrMethods, aal } = await getSessionAssurance();
  if (amrMethods.includes("oauth") || aal === "aal2") redirect(target);

  const keys = await getThrottleKeys(user.email ?? "");
  if (await isBlocked(keys)) {
    await failureDelay();
    return { error: LOCKED_CODE_ERROR };
  }

  const clean = typeof code === "string" ? code.replace(/\s+/g, "") : "";
  if (!/^\d{6}$/.test(clean)) return fail(keys, CODE_ERROR);

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp[0];
  if (!factor) {
    await supabase.auth.signOut({ scope: "local" });
    redirect("/acceso-equipo");
  }

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: clean });
  if (error) return fail(keys, CODE_ERROR);

  await recordAttempt(keys, true);
  redirect(target);
}
