/**
 * Puertas de la raíz (`/`): decide a dónde cae cada visita sin mostrar las
 * puertas cuando ya hay contexto. Función pura (sin red ni cookies) para
 * poder probarla; la página de `/` le pasa lo que leyó del pedido.
 *
 * Orden de la regla (gana la primera que aplica):
 *  1. Enlace dirigido a productoras (`?para=productores`)   → /productores
 *  2. Enlace de embajador o de una productora (`?ref=…`)   → /eventos (conserva el código)
 *  3. Sesión iniciada: productora (tiene nombre de productora) → su panel
 *  4. Sesión iniciada: público                               → /eventos
 *  5. Ya eligió un lado antes (cookie)                       → ese lado
 *  6. Sin contexto                                           → null (se muestran las puertas)
 */

export const SIDE_COOKIE = "anc_lado";
export const SIDE_STORAGE_KEY = "anc_lado";
/** 180 días: la elección es una preferencia, no un dato personal. */
export const SIDE_COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

export type Side = "eventos" | "productor";

export const SIDE_PATH: Record<Side, string> = {
  eventos: "/eventos",
  productor: "/productores",
};

export const PRODUCER_HOME = "/dashboard/events";

/** Destino de "Crear evento": pasa por /onboarding si falta el nombre de la productora. */
export const CREATE_EVENT_PATH = "/onboarding?next=%2Fdashboard%2Fevents%2Fnew";

export function parseSide(value: string | null | undefined): Side | null {
  return value === "eventos" || value === "productor" ? value : null;
}

/** Mismo formato que acepta el proxy para la cookie de embajador. */
const REF_RE = /^[A-Za-z0-9_-]{3,32}$/;

export type EntryInput = {
  para?: string | null;
  ref?: string | null;
  loggedIn: boolean;
  isProducer: boolean;
  side: Side | null;
};

export function decideEntry(input: EntryInput): string | null {
  const para = input.para?.trim().toLowerCase();
  if (para === "productores" || para === "productor" || para === "productoras") {
    return SIDE_PATH.productor;
  }

  const ref = input.ref?.trim();
  if (ref && REF_RE.test(ref)) {
    return `${SIDE_PATH.eventos}?ref=${encodeURIComponent(ref)}`;
  }

  if (input.loggedIn) return input.isProducer ? PRODUCER_HOME : SIDE_PATH.eventos;

  if (input.side) return SIDE_PATH[input.side];

  return null;
}
