import { createHash } from "node:crypto";

/**
 * Limitador de intentos del acceso con clave (/acceso-equipo).
 *
 * Los intentos se guardan en admin_login_attempts SOLO como hashes (sha256 con
 * sal): ni el correo ni la IP quedan en claro. Esta parte es pura (reloj
 * inyectable) para poder probarla; la lectura/escritura en la base está en
 * team-throttle-store.ts.
 *
 * LIMITACIÓN CONOCIDA: quien conozca el correo del administrador puede
 * provocar fallos a propósito y bloquear su ingreso con clave por unos minutos
 * (denegación de servicio acotada). El ingreso con Google no usa este
 * limitador y no se ve afectado.
 */

export const WINDOW_MS = 15 * 60 * 1000;
export const MAX_FAILS_PER_EMAIL = 8;
export const MAX_FAILS_PER_IP = 20;
/** Espera artificial tras un fallo, para frenar la fuerza bruta. */
export const FAILURE_DELAY_MS = 600;

export type Attempt = { email_hash: string; ip_hash: string; ok: boolean; created_at: string | number | Date };

/** sha256(sal + ":" + tipo + ":" + valor normalizado) en hexadecimal. */
export function hashIdentifier(kind: "email" | "ip", value: string, salt: string): string {
  const normalized = kind === "email" ? value.trim().toLowerCase() : value.trim();
  return createHash("sha256").update(`${salt}:${kind}:${normalized}`).digest("hex");
}

/** ¿Hay que bloquear? Cuenta solo fallos dentro de la ventana de 15 minutos. */
export function isLockedOut(
  attempts: readonly Attempt[],
  keys: { emailHash: string; ipHash: string },
  now: number | Date = Date.now()
): boolean {
  const nowMs = typeof now === "number" ? now : now.getTime();
  let byEmail = 0;
  let byIp = 0;
  for (const a of attempts) {
    if (a.ok) continue;
    const at = new Date(a.created_at).getTime();
    if (!Number.isFinite(at) || nowMs - at > WINDOW_MS || at > nowMs + 60_000) continue;
    if (a.email_hash === keys.emailHash) byEmail += 1;
    if (a.ip_hash === keys.ipHash) byIp += 1;
  }
  return byEmail >= MAX_FAILS_PER_EMAIL || byIp >= MAX_FAILS_PER_IP;
}

/** Primera IP de x-forwarded-for (Vercel la pone), o x-real-ip. Sin dato: "unknown". */
export function clientIpFromHeaders(get: (name: string) => string | null): string {
  const forwarded = get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || get("x-real-ip")?.trim() || "unknown";
}
