import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, MpAccount } from "@/lib/database.types";
import { refreshMpOAuthToken } from "@/lib/mercadopago";

type Admin = SupabaseClient<Database>;

/**
 * Devuelve un access token vigente de la cuenta de Mercado Pago del
 * productor, renovándolo si está por vencer. Lanza si no se puede renovar.
 */
export async function getFreshSellerToken(admin: Admin, account: MpAccount): Promise<string> {
  if (!account.refresh_token || !account.expires_at) return account.access_token;

  const expiresAt = new Date(account.expires_at).getTime();
  if (expiresAt - Date.now() >= 5 * 60 * 1000) return account.access_token;

  const refreshed = await refreshMpOAuthToken(account.refresh_token);
  await admin
    .from("mp_accounts")
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("organizer_id", account.organizer_id);

  return refreshed.access_token;
}

export async function getMpAccountByOrganizer(admin: Admin, organizerId: string) {
  const { data } = await admin
    .from("mp_accounts")
    .select("*")
    .eq("organizer_id", organizerId)
    .maybeSingle<MpAccount>();
  return data;
}

export async function getMpAccountByMpUserId(admin: Admin, mpUserId: string) {
  const { data } = await admin
    .from("mp_accounts")
    .select("*")
    .eq("mp_user_id", mpUserId)
    .maybeSingle<MpAccount>();
  return data;
}
