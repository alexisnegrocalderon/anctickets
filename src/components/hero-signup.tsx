"use client";

/**
 * Estilo ANC — Rave Editorial Noir: interfaz mono-lineal sobre video nocturno;
 * movimiento preciso, panel de registro sin tarjeta y lila reservado para conversión.
 */
import Link from "next/link";
import { FormEvent, useEffect, useId, useState } from "react";
import { authClient } from "@/lib/auth-client";

type FormState = "idle" | "loading" | "sent" | "error";

export default function HeroSignup() {
  const [email, setEmail] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
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

  async function requestMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormState("loading");

    try {
      const { error } = await authClient.signIn.magicLink({
        email,
        callbackURL: "/dashboard",
      });
      setFormState(error ? "error" : "sent");
    } catch {
      setFormState("error");
    }
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <>
      <header className="anc-hero-nav">
        <Link href="/" className="anc-hero-wordmark" aria-label="ANC Tickets, inicio">
          ANC<span>TICKETS</span>
        </Link>

        <nav className="anc-desktop-nav" aria-label="Navegación principal">
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#productores">Para productores</a>
          <a href="#eventos">Experiencia de venta</a>
          <a href="#registro" className="anc-nav-cta">Vender con ANC</a>
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
          <p className="anc-panel-chip">[ COMIENZA POR CORREO ]</p>
          <h2 id="signup-title">TU FECHA<br />EMPIEZA AQUÍ.</h2>
          <p className="anc-panel-subtitle">RECIBE UN ENLACE SEGURO. SIN CONTRASEÑA.</p>
          <form className="anc-signup-form" onSubmit={requestMagicLink} noValidate>
            <label className="sr-only" htmlFor="hero-email">Correo de acceso</label>
            <input
              id="hero-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Tu correo de productor"
              aria-describedby="hero-email-status"
            />
            <button type="submit" disabled={formState === "loading" || formState === "sent"}>
              {formState === "loading" ? "ENVIANDO ENLACE..." : formState === "sent" ? "REVISA TU CORREO" : "RECIBIR ENLACE DE ACCESO →"}
            </button>
          </form>
          <p id="hero-email-status" className={`anc-form-status is-${formState}`} aria-live="polite">
            {formState === "sent" && "Te enviamos un enlace. Revisa tu correo para continuar."}
            {formState === "error" && "No pudimos enviar el enlace. Inténtalo nuevamente."}
          </p>
          <Link href="/login" className="anc-panel-login">TAMBIÉN PUEDES INGRESAR CON GOOGLE ↗</Link>
        </section>
      </div>
    </>
  );
}
