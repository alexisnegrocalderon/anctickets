/** URL pública del sitio, sin barra final. */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

/** Cookie donde se guarda el código de embajador (?ref=CODIGO) por 30 días. */
export const AMBASSADOR_COOKIE = "anc_ref";
export const AMBASSADOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/** Cookie httpOnly con el nonce del flujo OAuth de Mercado Pago. */
export const MP_OAUTH_STATE_COOKIE = "mp_oauth_state";
