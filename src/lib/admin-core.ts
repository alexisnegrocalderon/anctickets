import type { User } from "@supabase/supabase-js";

/**
 * Parte PURA del acceso de administración (sin next/headers ni red): la usan
 * admin.ts, el proxy y los tests. Reglas de quién es admin y cómo inició sesión.
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

export type VerifiableUser = Pick<User, "email" | "email_confirmed_at" | "app_metadata" | "identities">;

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

export type AdminAccessDecision = "allow" | "deny";

/**
 * Decisión PURA de acceso al panel según cómo se inició la sesión.
 *  - No es admin: deny.
 *  - amr incluye 'oauth' (Google): allow.
 *  - Sesión aal2 (clave + código TOTP verificados en el mismo ingreso): allow.
 *  - Todo lo demás (clave sola, aal1; amr/aal ausentes): deny. La clave sola nunca basta.
 */
export function decideAdminAccess(input: {
  isAdmin: boolean;
  amrMethods: readonly string[] | null | undefined;
  aal: string | null | undefined;
}): AdminAccessDecision {
  if (!input.isAdmin) return "deny";
  if (input.amrMethods?.includes("oauth")) return "allow";
  if (input.aal === "aal2") return "allow";
  return "deny";
}

/**
 * Seguro de defensa en profundidad: ¿es una sesión de un correo admin que NO
 * es Google ni aal2 (clave sola)? Con el flujo de un solo paso no debería
 * existir; si aparece se cierra. Los no admin nunca caen aquí.
 */
export function isWeakAdminSession(input: {
  email: string | null | undefined;
  amrMethods: readonly string[] | null | undefined;
  aal: string | null | undefined;
}): boolean {
  if (!isAdminEmail(input.email)) return false;
  return decideAdminAccess({ isAdmin: true, amrMethods: input.amrMethods, aal: input.aal }) !== "allow";
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

