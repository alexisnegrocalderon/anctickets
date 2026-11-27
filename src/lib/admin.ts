import { cache } from "react";
import { notFound } from "next/navigation";
import { getSupabase, getVerifiedUser } from "@/lib/auth";
import { decideAdminAccess, extractAmrMethods, isAdminUser, type AdminAccessDecision } from "@/lib/admin-core";

export * from "@/lib/admin-core";

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
 *    con correo y clave exige además el código de 6 dígitos, que se verifica en
 *    el mismo paso (aal2). La clave sola (aal1) nunca abre el panel.
 */

/**
 * Admin actual o null. No lanza: sirve para decidir si mostrar un enlace
 * (p. ej. en Cuenta). Para proteger algo usa requireAdmin().
 */
export async function getAdminUser(): Promise<{ id: string; email: string } | null> {
  const user = await getVerifiedUser();
  if (!user || !user.email || !isAdminUser(user)) return null;
  return { id: user.id, email: user.email.trim().toLowerCase() };
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
  return { admin, decision: decideAdminAccess({ isAdmin: true, amrMethods, aal }) };
});

/** Exige admin en el servidor. No admin, o clave sola: 404 (no revela que /admin existe). */
export async function requireAdmin(): Promise<{ id: string; email: string }> {
  const { admin, decision } = await getAdminAccess();
  if (!admin || decision !== "allow") notFound();
  return admin;
}
