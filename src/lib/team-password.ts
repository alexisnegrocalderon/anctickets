/**
 * Reglas de la clave del administrador (acceso /acceso-equipo). Funciones
 * puras, sin red ni estado. Nunca se registra ni se muestra la clave.
 */

export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 72; // límite de bcrypt en Supabase Auth (72 bytes)

/** Valida una clave nueva. Devuelve el mensaje de error o null si es válida. */
export function validateNewPassword(password: string, confirm: string, email: string | null | undefined): string | null {
  if (password.length < PASSWORD_MIN) return `La clave debe tener al menos ${PASSWORD_MIN} caracteres.`;
  if (password.length > PASSWORD_MAX || new TextEncoder().encode(password).length > PASSWORD_MAX) {
    return `La clave no puede superar los ${PASSWORD_MAX} caracteres.`;
  }
  const mail = (email ?? "").trim().toLowerCase();
  const lower = password.toLowerCase();
  if (mail && (lower === mail || lower.includes(mail))) return "La clave no puede ser ni contener tu correo.";
  if (new Set(password).size <= 3) return "La clave es demasiado repetitiva. Usa una frase más larga.";
  if (password !== confirm) return "Las claves no coinciden.";
  return null;
}

export type PasswordStrength = { score: 0 | 1 | 2 | 3; label: string };

/**
 * Indicador simple de fortaleza: prima el largo y la variedad de caracteres,
 * sin exigir mayúsculas ni símbolos. Solo orienta; la regla dura es validateNewPassword.
 */
export function passwordStrength(password: string): PasswordStrength {
  if (password.length === 0) return { score: 0, label: "" };
  if (password.length < PASSWORD_MIN) return { score: 0, label: "Muy corta" };
  const unique = new Set(password).size;
  if (unique <= 3) return { score: 0, label: "Muy repetitiva" };
  let points = 0;
  if (password.length >= 16) points += 1;
  if (password.length >= 22) points += 1;
  if (unique >= 10) points += 1;
  if (/\s/.test(password) && password.length >= 16) points += 1; // frase con espacios
  const score = Math.min(points, 3) as 0 | 1 | 2 | 3;
  return { score: Math.max(score, 1) as 1 | 2 | 3, label: ["", "Aceptable", "Buena", "Muy buena"][Math.max(score, 1)] };
}
