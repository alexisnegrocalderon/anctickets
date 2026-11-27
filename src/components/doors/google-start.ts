"use client";

import { createClient } from "@/lib/supabase/client";

/** Abre Google y, al volver, sigue a `next` (validado otra vez en /auth/callback). */
export async function startGoogle(next: string): Promise<string | null> {
  const supabase = createClient();
  const callbackUrl = new URL("/auth/callback", window.location.origin);
  callbackUrl.searchParams.set("next", next);
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl.toString() },
  });
  return error ? "No pudimos abrir Google. Revisa tu conexión e inténtalo de nuevo." : null;
}
