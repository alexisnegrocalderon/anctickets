"use client";

/** ANC — el afiche amarillo corchetado al muro: la acción primaria del productor. */
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function PosterSignup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (authError) {
      setError("No pudimos abrir Google. Revisa tu conexión e inténtalo de nuevo.");
      setLoading(false);
    }
  }

  return (
    <div className="relative w-full max-w-sm">
      <span className="staple" style={{ top: "-2px", left: "22%" }} aria-hidden="true" />
      <span className="staple" style={{ top: "-2px", right: "22%" }} aria-hidden="true" />
      <div className="poster ink-yellow paper px-6 py-7" style={{ "--rot": "-1.2deg" } as React.CSSProperties}>
        <p className="poster-type text-[2.1rem] sm:text-[2.6rem]">Publica tu fecha</p>
        <p className="mt-3 text-[15px] leading-6 text-[#2a2a08]">
          Entras con tu cuenta de Google. Sin contraseñas nuevas, sin formularios eternos.
        </p>
        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={loading}
          className="poster-type mt-6 flex w-full items-center justify-center gap-3 bg-[#090909] px-5 py-4 text-lg text-[#ece7dc] transition-transform duration-100 hover:bg-[#1d1d1d] active:scale-[.98] disabled:opacity-60"
        >
          <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z" />
            <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.16.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
          </svg>
          {loading ? "Abriendo Google…" : "Entrar con Google"}
        </button>
        {error ? (
          <p role="alert" className="mt-3 text-sm font-semibold text-[#7a0f2e]">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
