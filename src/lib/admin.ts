import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getSupabase, getVerifiedUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/safe-redirect";

/**
 * Acceso al panel de administración de ANC.
 *
 * Reglas (fallan cerrado):
 *  - Solo entran los correos de la variable de entorno ADMIN_EMAILS (lista
 *    separada por comas, sin distinguir mayúsculas, con espacios recortados).
 *  - Variable ausente o vacía: nadie es admin.
 *  - Se usa la verificación FUERTE del usuario (getUser, consulta al servidor de
 *    Auth) y se exige correo verificado.
 *  - Quien no cumple recibe 404 (nunca 403 ni redirección), para no revelar que
 *    /admin existe.
 *  - Método de ingreso (ver decideAdminAccess): entrar con Google basta; entrar
 *    con correo y clave exige además el código de 6 dígitos (aal2). La clave
 *    sola nunca abre el panel.
 */

/** Parsea la lista de correos: minúsculas, sin espacios, sin vacíos ni repetidos. */
export function parseAdminEmails(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const email = part.trim().toLowerCase();
    if (email) seen.add(email);
  }
  return [...seen];
}

/** Correos admin leídos de ADMIN_EMAILS en el momento de la llamada. */
export function getAdminEmails(): string[] {
  return parseAdminEmails(process.env.ADMIN_EMAILS);
}

/** ¿Está este correo en la lista? Sin correo o lista vacía: false. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  return getAdminEmails().includes(normalized);
}

type VerifiableUser = Pick<User, "email" | "email_confirmed_at" | "app_metadata" | "identities">;

/** Correo verificado: confirmado en Auth, o cuenta de Google (Google ya lo verificó). */
export function hasVerifiedEmail(user: Partial<VerifiableUser> | null | undefined): boolean {
  if (!user) return false;
  if (user.email_confirmed_at) return true;
  const meta = user.app_metadata as { provider?: unknown; providers?: unknown } | undefined;
  if (meta?.provider === "google") return true;
  if (Array.isArray(meta?.providers) && meta.providers.includes("google")) return true;
  return false;
}

/** Decisión pura: ¿este usuario ya verificado por Auth es admin? */
export function isAdminUser(user: Partial<VerifiableUser> | null | undefined): boolean {
  return !!user && hasVerifiedEmail(user) && isAdminEmail(user.email);
}

/**
 * Admin actual o null. No lanza: sirve para decidir si mostrar un enlace
 * (p. ej. en Cuenta). Para proteger algo usa requireAdmin().
 */
export async function getAdminUser(): Promise<{ id: string; email: string } | null> {
  const user = await getVerifiedUser();
  if (!user || !user.email || !isAdminUser(user)) return null;
  return { id: user.id, email: user.email.trim().toLowerCase() };
}

export type AdminAccessDecision = "allow" | "verify" | "deny";

/**
 * Decisión PURA de acceso al panel según cómo se inició la sesión.
 *  - No es admin: deny.
 *  - amr incluye 'oauth' (Google): allow.
 *  - Sesión aal2 (el código TOTP ya se verificó): allow.
 *  - Si no (solo clave, aal1): con factor TOTP verificado -> verify (pedir el
 *    código); sin factor -> deny (la clave sola nunca abre el panel).
 * amrMethods ausente/vacío o aal ausente se tratan como "sin garantías": falla cerrado.
 */
export function decideAdminAccess(input: {
  isAdmin: boolean;
  amrMethods: readonly string[] | null | undefined;
  aal: string | null | undefined;
  hasVerifiedTotp: boolean;
}): AdminAccessDecision {
  if (!input.isAdmin) return "deny";
  if (input.amrMethods?.includes("oauth")) return "allow";
  if (input.aal === "aal2") return "allow";
  return input.hasVerifiedTotp ? "verify" : "deny";
}

/** Nombres de método del claim amr (acepta strings RFC-8176 u objetos { method }). */
export function extractAmrMethods(amr: unknown): string[] {
  if (!Array.isArray(amr)) return [];
  const methods: string[] = [];
  for (const entry of amr) {
    if (typeof entry === "string") methods.push(entry);
    else if (entry && typeof entry === "object" && typeof (entry as { method?: unknown }).method === "string") {
      methods.push((entry as { method: string }).method);
    }
  }
  return methods;
}

/**
 * Método de ingreso de la sesión actual, desde los claims con la firma
 * verificada (getClaims; nunca se decodifica el JWT a mano).
 */
export async function getSessionAssurance(): Promise<{ amrMethods: string[]; aal: string | null }> {
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  return {
    amrMethods: extractAmrMethods(claims?.amr),
    aal: typeof claims?.aal === "string" ? claims.aal : null,
  };
}

/** ¿El usuario de la sesión tiene un factor TOTP verificado? Error de lectura: false. */
export async function hasVerifiedTotpFactor(): Promise<boolean> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error || !data) return false;
  return data.totp.length > 0;
}

/**
 * Decisión de acceso de la petición actual, sin lanzar nada. Devuelve el admin
 * (si lo es) y la decisión según el método de ingreso.
 */
export const getAdminAccess = cache(async (): Promise<{ admin: { id: string; email: string } | null; decision: AdminAccessDecision }> => {
  const admin = await getAdminUser();
  if (!admin) return { admin: null, decision: "deny" };

  const { amrMethods, aal } = await getSessionAssurance();
  let decision = decideAdminAccess({ isAdmin: true, amrMethods, aal, hasVerifiedTotp: false });
  if (decision !== "allow") {
    // Solo se consulta el factor cuando hace falta (sesión con clave, aal1).
    decision = decideAdminAccess({ isAdmin: true, amrMethods, aal, hasVerifiedTotp: await hasVerifiedTotpFactor() });
  }
  return { admin, decision };
});

/**
 * Exige admin en el servidor. No admin o clave sola sin factor: 404 (no revela
 * que /admin existe). Clave sola con factor: redirige a pedir el código.
 * `next` es a dónde volver tras verificar (por defecto /admin).
 */
export async function requireAdmin(next: string = "/admin"): Promise<{ id: string; email: string }> {
  const { admin, decision } = await getAdminAccess();
  if (!admin) notFound();
  if (decision === "verify") redirect(`/acceso-equipo/verificar?next=${encodeURIComponent(safeNextPath(next, "/admin"))}`);
  if (decision !== "allow") notFound();
  return admin;
}
