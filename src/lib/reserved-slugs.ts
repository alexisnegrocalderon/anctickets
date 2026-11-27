import { slugify } from "./slug";

/**
 * Slugs que chocarían con rutas estáticas de la app (o con rutas que podríamos
 * agregar pronto). El slug de un evento vive en la raíz (`/{slug}`), así que
 * cualquiera de estas palabras taparía una página real.
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "api",
  "auth",
  "login",
  "logout",
  "signin",
  "signup",
  "register",
  "dashboard",
  "onboarding",
  "events",
  "evento",
  "eventos",
  "productores",
  "productor",
  "cartelera",
  "acceso-equipo",
  "scan",
  "mis-entradas",
  "tickets",
  "entradas",
  "privacidad",
  "terminos",
  "admin",
  "ayuda",
  "soporte",
  "contacto",
  "checkout",
  "cron",
  "webhooks",
  "static",
  "public",
  "assets",
  "favicon",
  "icon",
  "opengraph-image",
  "robots",
  "robots-txt",
  "sitemap",
  "sitemap-xml",
  "_next",
  "anc",
  "ancdigital",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

/** Slug normalizado y seguro: si cae en una palabra reservada se le agrega un sufijo. */
export function safeSlug(input: string, fallback = "evento"): string {
  const base = slugify(input) || fallback;
  return isReservedSlug(base) ? `${base}-evento` : base;
}
