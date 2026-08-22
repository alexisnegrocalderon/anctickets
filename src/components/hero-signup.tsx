"use client";

/**
 * Estilo ANC — Rave Editorial Noir: interfaz mono-lineal sobre video nocturno;
 * movimiento preciso, panel de registro con Google y lila reservado para conversión.
 */
import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function HeroSignup() {
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    document.body.classList.toggle("anc-menu-open", menuOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("anc-menu-open");
    };
  }, [menuOpen]);

  async function signInWithGoogle() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <>
      <header className="anc-hero-nav">
        <Link href="/" className="anc-hero-wordmark-link" aria-label="ANC Tickets, inicio">
          <Image src="/anc-mark.png" alt="" width={32} height={32} priority />
          <span className="anc-hero-wordmark">
            ANC<span>TICKETS</span>
          </span>
        </Link>

        <nav className="anc-desktop-nav" aria-label="Navegación principal">
          <a href="#como-funciona" data-cursor-hover>Cómo funciona</a>
          <a href="#productores" data-cursor-hover>Para productores</a>
          <a href="#eventos" data-cursor-hover>Experiencia de venta</a>
          <a href="#registro" data-cursor-hover className="anc-nav-cta">Vender con ANC</a>
        </nav>

        <button
          type="button"
          className={`anc-menu-toggle ${menuOpen ? "is-open" : ""}`}
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
          aria-controls={menuId}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      <div
        id={menuId}
        className={`anc-mobile-menu ${menuOpen ? "is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menú de ANC Tickets"
        aria-hidden={!menuOpen}
      >
        <nav className="anc-mobile-menu-links" aria-label="Navegación móvil">
          <a href="#como-funciona" style={{ "--item": 0 } as React.CSSProperties} onClick={closeMenu}>Cómo funciona</a>
          <a href="#productores" style={{ "--item": 1 } as React.CSSProperties} onClick={closeMenu}>Productores</a>
          <a href="#eventos" style={{ "--item": 2 } as React.CSSProperties} onClick={closeMenu}>Experiencia</a>
          <a href="#registro" style={{ "--item": 3 } as React.CSSProperties} onClick={closeMenu}>Vender con ANC</a>
        </nav>
      </div>

      <div className="anc-hero-body">
        <div className="anc-hero-copy">
          <p className="anc-eyebrow">ANC TICKETS / PRODUCTORES EN CHILE</p>
          <h1>
            VENDE.<br />
            <span>COBRA DIRECTO.</span>
          </h1>
          <p className="anc-hero-description">
            Crea tu fecha, conecta Mercado Pago y recibe cada venta directo en la cuenta de tu organización.
          </p>
          <div className="anc-hero-metrics" aria-label="Ventajas de la plataforma">
            <span>01 / COSTO ANC $0</span>
            <span>02 / PAGO DIRECTO</span>
            <span>03 / QR EN PUERTA</span>
          </div>
        </div>

        <section id="registro" className="anc-signup-panel" aria-labelledby="signup-title">
          <p className="anc-panel-chip">[ COMIENZA CON GOOGLE ]</p>
          <h2 id="signup-title">TU FECHA<br />EMPIEZA AQUÍ.</h2>
          <p className="anc-panel-subtitle">SIN CONTRASEÑA. SIN FORMULARIOS ETERNOS.</p>
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={loading}
            className="anc-google-button"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"
              />
              <path
                fill="#34A853"
                d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z"
              />
              <path
                fill="#FBBC05"
                d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.16.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z"
              />
              <path
                fill="#EA4335"
                d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"
              />
            </svg>
            {loading ? "CONECTANDO..." : "CONTINUAR CON GOOGLE →"}
          </button>
        </section>
      </div>
    </>
  );
}
