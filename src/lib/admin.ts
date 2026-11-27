import { notFound } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getVerifiedUser } from "@/lib/auth";

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

/** Exige admin en el servidor; si no lo es responde 404. Devuelve el admin. */
export async function requireAdmin(): Promise<{ id: string; email: string }> {
  const admin = await getAdminUser();
  if (!admin) notFound();
  return admin;
}
