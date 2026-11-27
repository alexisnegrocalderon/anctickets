"use client";

import { SIDE_COOKIE, SIDE_COOKIE_MAX_AGE, SIDE_STORAGE_KEY, parseSide, type Side } from "@/lib/entry-routing";

/**
 * Recuerda qué lado eligió la persona (cartelera o productor). Solo guarda la
 * palabra del lado: ningún dato personal. La cookie la lee el servidor para
 * redirigir sin parpadeo; localStorage es el respaldo (puede fallar en ventana
 * privada, por eso va en try/catch).
 */
export function rememberSide(side: Side) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${SIDE_COOKIE}=${side}; Max-Age=${SIDE_COOKIE_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
  try {
    window.localStorage.setItem(SIDE_STORAGE_KEY, side);
  } catch {
    // Sin almacenamiento (modo privado o bloqueado): basta con la cookie.
  }
}

/** Si se perdió la cookie pero quedó el respaldo, la repone para la próxima visita. */
export function restoreSideCookie() {
  if (document.cookie.split("; ").some((c) => c.startsWith(`${SIDE_COOKIE}=`))) return;
  let saved: Side | null = null;
  try {
    saved = parseSide(window.localStorage.getItem(SIDE_STORAGE_KEY));
  } catch {
    return;
  }
  if (saved) rememberSide(saved);
}
