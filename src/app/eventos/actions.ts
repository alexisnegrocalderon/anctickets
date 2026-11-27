"use server";

import { getVerifiedUser, getSupabase } from "@/lib/auth";
import { isReactionKey } from "@/lib/cartelera";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ReactionResult = { ok: true; on: boolean } | { ok: false; reason: "login" | "error" };

/**
 * Pone o quita una reacción de la persona que tiene la sesión. Las políticas
 * RLS (migración 0015) garantizan que solo toca las suyas y solo en eventos
 * publicados; aquí además se validan los datos.
 */
export async function setReaction(eventId: string, key: string, on: boolean): Promise<ReactionResult> {
  if (!UUID_RE.test(eventId) || !isReactionKey(key)) return { ok: false, reason: "error" };
  const user = await getVerifiedUser();
  if (!user) return { ok: false, reason: "login" };
  const supabase = await getSupabase();

  if (on) {
    const { error } = await supabase
      .from("event_reactions")
      .upsert({ event_id: eventId, user_id: user.id, emoji: key }, { onConflict: "event_id,user_id,emoji", ignoreDuplicates: true });
    return error ? { ok: false, reason: "error" } : { ok: true, on: true };
  }

  const { error } = await supabase
    .from("event_reactions")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .eq("emoji", key);
  return error ? { ok: false, reason: "error" } : { ok: true, on: false };
}
