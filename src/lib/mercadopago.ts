import { createHmac, timingSafeEqual } from "node:crypto";

export function getMpAuthorizeUrl(state: string) {
  const url = new URL("https://auth.mercadopago.com/authorization");
  url.searchParams.set("client_id", process.env.MP_APP_CLIENT_ID!);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("platform_id", "mp");
  url.searchParams.set(
    "redirect_uri",
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/mercadopago/oauth/callback`
  );
  url.searchParams.set("state", state);
  return url.toString();
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

export async function exchangeMpOAuthCode(
  code: string
): Promise<MpOAuthTokenResponse> {
  const response = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.MP_APP_CLIENT_ID,
      client_secret: process.env.MP_APP_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/mercadopago/oauth/callback`,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Error intercambiando código OAuth de Mercado Pago: ${text}`);
  }

  return response.json();
}

export interface MpPreferenceItem {
  title: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
}

export interface MpPreferenceParams {
  organizerAccessToken: string;
  items: MpPreferenceItem[];
  marketplaceFee: number;
  externalReference: string;
  payerEmail: string;
  successUrl: string;
  failureUrl: string;
  pendingUrl: string;
  notificationUrl: string;
  /** Cuándo vence el link de pago (coincide con el fin de la reserva de stock). */
  expirationDateTo?: string;
}

export async function createMpPreference(params: MpPreferenceParams) {
  const response = await fetch(
    "https://api.mercadopago.com/checkout/preferences",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.organizerAccessToken}`,
      },
      body: JSON.stringify({
        items: params.items,
        marketplace_fee: params.marketplaceFee,
        external_reference: params.externalReference,
        payer: { email: params.payerEmail },
        back_urls: {
          success: params.successUrl,
          failure: params.failureUrl,
          pending: params.pendingUrl,
        },
        auto_return: "approved",
        notification_url: params.notificationUrl,
        ...(params.expirationDateTo
          ? {
              expires: true,
              expiration_date_from: new Date().toISOString(),
              expiration_date_to: params.expirationDateTo,
            }
          : {}),
        // Solo pago único: con cuotas, la comisión real de Mercado Pago supera
        // el cargo de servicio y el organizador dejaría de recibir el 100%
        // del valor de su entrada (ver src/lib/fees.ts).
        payment_methods: {
          installments: 1,
          default_installments: 1,
        },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Error creando preferencia de Mercado Pago: ${text}`);
  }

  return response.json() as Promise<{ id: string; init_point: string }>;
}

/**
 * Verifica la firma x-signature de las notificaciones webhook de Mercado Pago.
 * Ver: https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks#editor_2
 */
export function verifyMpWebhookSignature(params: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string;
}): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return false;
  if (!params.xSignature) return false;

  const parts = new Map<string, string>();
  for (const part of params.xSignature.split(",")) {
    const [key, value] = part.split("=");
    if (key && value !== undefined) {
      parts.set(key.trim(), value.trim());
    }
  }

  const ts = parts.get("ts");
  const receivedHash = parts.get("v1");
  if (!ts || !receivedHash) return false;

  const dataIdLower = params.dataId.toLowerCase();
  const manifest = `id:${dataIdLower};${
    params.xRequestId ? `request-id:${params.xRequestId};` : ""
  }ts:${ts};`;

  const expectedHash = createHmac("sha256", secret).update(manifest).digest("hex");

  const expectedBuffer = Buffer.from(expectedHash, "hex");
  const receivedBuffer = Buffer.from(receivedHash, "hex");

  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export interface MpRefreshTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: number;
  refresh_token: string;
  public_key: string;
  live_mode: boolean;
}

export async function refreshMpOAuthToken(
  refreshToken: string
): Promise<MpRefreshTokenResponse> {
  const response = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.MP_APP_CLIENT_ID,
      client_secret: process.env.MP_APP_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Error renovando token OAuth de Mercado Pago: ${text}`);
  }

  return response.json();
}

export interface MpPayment {
  id: number;
  status: string;
  status_detail?: string;
  external_reference?: string | null;
  transaction_amount: number;
  currency_id?: string;
  collector_id?: number | string | null;
  transaction_amount_refunded?: number;
}

/** Error de la API de MP con el status HTTP, para decidir si conviene reintentar. */
export class MpApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

/**
 * Consulta un pago. Los pagos de un marketplace viven en la cuenta del
 * VENDEDOR (el productor), así que hay que consultarlos con el token del
 * vendedor; el token de ANC solo sirve como respaldo.
 */
export async function getMpPayment(paymentId: string, accessToken: string): Promise<MpPayment> {
  const response = await fetch(
    `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new MpApiError(`Error consultando pago de Mercado Pago: ${text}`, response.status);
  }

  return response.json();
}
