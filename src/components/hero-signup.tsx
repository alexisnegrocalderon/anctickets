"use client";

/** ANC — la acción primaria del productor: entrar con Google y publicar. */
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const primaryClass =
  "flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-[var(--anc-vermilion)] px-7 py-4 text-base font-black uppercase tracking-tight text-[var(--anc-ink)] shadow-[0_18px_50px_-14px_rgba(252,76,19,.7)] transition duration-300 [transition-timing-function:var(--ease-out)] hover:brightness-95 active:scale-[.98] disabled:opacity-60";

const ghostClass =
  "flex min-h-14 w-full items-center justify-center gap-3 rounded-full border border-white/30 px-7 py-4 text-base font-black uppercase tracking-tight text-white transition duration-300 [transition-timing-function:var(--ease-out)] hover:border-white hover:bg-white/10 active:scale-[.98] disabled:opacity-60";

export default function HeroSignup({
  compact = false,
  loggedIn = false,
  variant = "primary",
}: {
  compact?: boolean;
  /** Con sesión, el CTA lleva directo al wizard en vez de abrir Google. */
  loggedIn?: boolean;
  /** "ghost" = botón secundario con borde, para convivir con "Instalar app". */
  variant?: "primary" | "ghost";
}) {
  const ctaClass = variant === "ghost" ? ghostClass : primaryClass;
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

  if (loggedIn) {
    return (
      <div className="w-full">
        <Link href="/dashboard/events/new" className={ctaClass}>
          Publicar mi evento gratis
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      <button type="button" onClick={signInWithGoogle} disabled={loading} className={ctaClass}>
        <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z" />
          <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.16.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z" />
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
        </svg>
        {loading ? "Abriendo Google…" : "Publicar mi evento gratis"}
      </button>
      {!compact ? (
        <p className="mt-3 text-sm text-[var(--anc-muted-text)] sm:text-left">
          Entras con tu cuenta de Google. Sin contraseñas nuevas, sin tarjeta de crédito.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className={`mt-3 text-sm font-semibold text-[#ffb39c]`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
