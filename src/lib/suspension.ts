import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/auth";

/**
 * Suspensión de productoras (migración 0010). Las lecturas son tolerantes: si la
 * columna aún no existe (migración sin aplicar) o la consulta falla, se trata como
 * "no suspendida" para no romper el panel ni la página pública.
 */

export const SUSPENDED_ACCOUNT_MESSAGE = "Tu cuenta está suspendida. Contacta a ANC.";
export const SUSPENDED_SALES_MESSAGE = "Las ventas de este evento no están disponibles por ahora.";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, any, any>;

/** Fecha de suspensión del perfil (o null). Funciona con el cliente de usuario (RLS: el propio perfil) o el de servicio. */
export async function readSuspendedAt(client: AnyClient, profileId: string): Promise<string | null> {
  try {
    const { data, error } = await client.from("profiles").select("suspended_at").eq("id", profileId).maybeSingle();
    if (error || !data) return null;
    return (data as { suspended_at: string | null }).suspended_at ?? null;
  } catch {
    return null;
  }
}

/** Suspensión de la productora que ha iniciado sesión (una consulta por petición). */
export const getOwnSuspendedAt = cache(async (userId: string) => {
  const supabase = await getSupabase();
  return readSuspendedAt(supabase, userId);
});

/** Error en español si la productora está suspendida (para acciones que publican o crean tandas); null si puede seguir. */
export async function suspendedActionError(client: AnyClient, userId: string): Promise<string | null> {
  const at = await readSuspendedAt(client, userId);
  return at ? SUSPENDED_ACCOUNT_MESSAGE : null;
}
