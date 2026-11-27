/**
 * Valida el parámetro `next` de los flujos de login: solo rutas internas.
 * Rechaza URLs absolutas, `//host` (protocol-relative) y `/\host`, que algunos
 * navegadores tratan como `//host`.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard/events"): string {
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\\]/.test(next)) return fallback;
  return next;
}

/**
 * Destino después del onboarding: solo rutas del panel de productora
 * (`/dashboard/...`). Cualquier otra cosa vuelve a la lista de eventos.
 */
export function onboardingNext(next: string | null | undefined): string {
  const path = safeNextPath(next, "/dashboard/events");
  return path === "/dashboard" || path.startsWith("/dashboard/") ? path : "/dashboard/events";
}
