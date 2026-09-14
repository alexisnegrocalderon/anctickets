"use client";

/** ANC — botón del header: dispara el login de Google directo, sin scrollear al hero. */
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function NavSignupButton() {
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={signInWithGoogle}
      disabled={loading}
      className="rounded-full bg-[var(--anc-vermilion)] px-5 py-2.5 text-sm font-black uppercase tracking-tight text-[var(--anc-ink)] transition-transform duration-150 hover:brightness-95 active:scale-95 disabled:opacity-60"
    >
      {loading ? "Abriendo Google…" : "Publica gratis"}
    </button>
  );
}
