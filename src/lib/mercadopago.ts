import { createHmac, timingSafeEqual } from "node:crypto";

export function getMpAuthorizeUrl(state: string) {
  const url = new URL("https://auth.mercadopago.com/authorization");
  url.searchParams.set("client_id", process.env.MP_APP_CLIENT_ID!);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("platform_id", "mp");
  url.searchParams.set("redirect_uri", `${process.env.NEXT_PUBLIC_SITE_URL}/api/mercadopago/oauth/callback`);
  url.searchParams.set("state", state);
  return url.toString();
}

type MpOauthState = { organizationId: string; userId: string; expiresAt: number };

function getStateSecret() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET es obligatorio para conectar Mercado Pago.");
  return secret;
}

function signState(payload: string) {
  return createHmac("sha256", getStateSecret()).update(payload).digest("base64url");
}

export function createMpOAuthState(organizationId: string, userId: string) {
  const payload = Buffer.from(JSON.stringify({ organizationId, userId, expiresAt: Date.now() + 10 * 60 * 1000 } satisfies MpOauthState)).toString("base64url");
  return `${payload}.${signState(payload)}`;
}

export function verifyMpOAuthState(state: string): MpOauthState | null {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) return null;
  const expected = signState(payload);
  const valid = signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!valid) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as MpOauthState;
    return value.organizationId && value.userId && value.expiresAt > Date.now() ? value : null;
  } catch {
    return null;
  }
}

export interface MpOAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: number;
  refresh_token: string;
  public_key: string;
  live_mode: boolean;
}

export async function exchangeMpOAuthCode(code: string): Promise<MpOAuthTokenResponse> {
  const response = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: process.env.MP_APP_CLIENT_ID, client_secret: process.env.MP_APP_CLIENT_SECRET, grant_type: "authorization_code", code, redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/mercadopago/oauth/callback` }),
  });
  if (!response.ok) throw new Error(`Error intercambiando código OAuth de Mercado Pago: ${await response.text()}`);
  return response.json();
}

export interface MpPreferenceItem { title: string; quantity: number; unit_price: number }
export interface MpPreferenceParams { organizerAccessToken: string; items: MpPreferenceItem[]; marketplaceFee: number; externalReference: string; payerEmail: string; successUrl: string; failureUrl: string; pendingUrl: string; notificationUrl: string }

export async function createMpPreference(params: MpPreferenceParams) {
  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${params.organizerAccessToken}` },
    body: JSON.stringify({ items: params.items, marketplace_fee: params.marketplaceFee, external_reference: params.externalReference, payer: { email: params.payerEmail }, back_urls: { success: params.successUrl, failure: params.failureUrl, pending: params.pendingUrl }, auto_return: "approved", notification_url: params.notificationUrl }),
  });
  if (!response.ok) throw new Error(`Error creando preferencia de Mercado Pago: ${await response.text()}`);
  return response.json() as Promise<{ id: string; init_point: string }>;
}

export async function getMpPayment(paymentId: string) {
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, { headers: { Authorization: `Bearer ${process.env.MP_ANC_ACCESS_TOKEN}` } });
  if (!response.ok) throw new Error(`Error consultando pago de Mercado Pago: ${await response.text()}`);
  return response.json();
}
