"use client";

/**
 * Puertas de la raíz: "Próximos eventos" o "Soy productor". La animación de la
 * portada queda de fondo, oscurecida. "Soy productor" abre una hoja con dos
 * caminos: crear el evento al tiro (Google → asistente) o ver la portada.
 * Solo la ve quien llega sin contexto: el resto se redirige en el servidor.
 */
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import HeroVideo from "@/components/hero-video";
import { CREATE_EVENT_PATH } from "@/lib/entry-routing";
import { startGoogle } from "./google-start";
import { rememberSide, restoreSideCookie } from "./remember-side";
import { track } from "./track";

export default function DoorsScreen() {
  const sheetRef = useRef<HTMLDialogElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    restoreSideCookie();
    track("puertas_vista");
  }, []);

  async function createEvent(origin: "encabezado" | "hoja") {
    rememberSide("productor");
    track(origin === "hoja" ? "productor_crear" : "encabezado_crear");
    setLoading(true);
    setError(null);
    const err = await startGoogle(CREATE_EVENT_PATH);
    if (err) {
      setError(err);
      setLoading(false);
    }
  }

  function openSheet() {
    track("puerta_productor");
    setError(null);
    sheetRef.current?.showModal();
  }

  return (
    <main className="doors relative isolate flex min-h-dvh flex-col overflow-hidden bg-[var(--anc-bg)] text-white">
      <HeroVideo />
      <div className="doors-scrim" aria-hidden="true" />

      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] sm:px-8">
        <Link
          href="/productores"
          className="doors-logo glass"
          style={{ ["--gr" as string]: "9999px" }}
          aria-label="ANC Tickets, cómo funciona para productoras"
        >
          <Image src="/anc-mark.png" alt="" width={24} height={24} priority />
          <span className="font-display text-lg uppercase">ANC</span>
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/login" className="doors-enter">
            Entrar
          </Link>
          <button
            type="button"
            className="doors-create"
            onClick={() => createEvent("encabezado")}
            disabled={loading}
          >
            <span aria-hidden="true">✚</span> Crear evento
          </button>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-5 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] pt-6 sm:gap-8 sm:px-8">
        <h1 className="doors-title font-display uppercase">
          ¿Qué vienes
          <br /> a hacer <span className="text-[var(--doors-yellow)]">hoy?</span>
        </h1>

        {error ? (
          <p role="alert" className="rounded-xl bg-black/60 px-4 py-3 text-sm font-semibold text-[#ffb39c]">
            {error}
          </p>
        ) : null}

        <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-5">
          <Link
            href="/eventos"
            className="door door--events"
            onClick={() => {
              rememberSide("eventos");
              track("puerta_eventos");
            }}
          >
            <span className="door-title font-display uppercase">
              <span aria-hidden="true">🎟 </span>Próximos eventos
            </span>
            <span className="door-text">Descubre qué hay esta semana, reacciona y compra tus entradas.</span>
            <span className="door-foot">
              Ver la cartelera
              <span className="door-arrow" aria-hidden="true">→</span>
            </span>
          </Link>

          <button type="button" className="door door--producer" onClick={openSheet} aria-haspopup="dialog">
            <span className="door-chip">
              <i aria-hidden="true" />
              2:00 para crear tu evento
            </span>
            <span className="door-title font-display uppercase">
              <span aria-hidden="true">🎤 </span>Soy productor
            </span>
            <span className="door-text">Vende entradas, mira las ventas en vivo y cobra en tu Mercado Pago.</span>
            <span className="door-foot">
              Empezar
              <span className="door-arrow" aria-hidden="true">→</span>
            </span>
          </button>
        </div>
      </div>

      <dialog
        ref={sheetRef}
        className="doors-sheet"
        aria-labelledby="doors-sheet-title"
        onClick={(e) => {
          // Tocar fuera de la hoja la cierra.
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
      >
        <div className="doors-sheet-body">
          <span className="doors-sheet-grip" aria-hidden="true" />
          <div className="flex items-center justify-between gap-3">
            <h2 id="doors-sheet-title" className="font-display text-3xl uppercase">
              Soy productor
            </h2>
            <button
              type="button"
              className="doors-sheet-close"
              aria-label="Cerrar"
              onClick={() => sheetRef.current?.close()}
            >
              ✕
            </button>
          </div>

          <button type="button" className="path path--fast" onClick={() => createEvent("hoja")} disabled={loading}>
            <span className="path-icon path-icon--fast" aria-hidden="true">⚡</span>
            <span className="min-w-0">
              <span className="path-title">{loading ? "Abriendo Google…" : "Crear mi evento en 2 minutos"}</span>
              <span className="path-text">Entras con Google y caes directo en el asistente. Sin vueltas.</span>
            </span>
          </button>

          <Link
            href="/productores"
            className="path"
            onClick={() => {
              rememberSide("productor");
              track("productor_ver_como");
            }}
          >
            <span className="path-icon" aria-hidden="true">▶</span>
            <span className="min-w-0">
              <span className="path-title">Ver cómo funciona</span>
              <span className="path-text">Mira la demostración completa: ventas en vivo, escáner QR y pagos.</span>
            </span>
          </Link>

          {error ? (
            <p role="alert" className="text-sm font-semibold text-[#ffb39c]">
              {error}
            </p>
          ) : null}

          <p className="text-center text-sm text-white/70">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="inline-flex min-h-11 items-center font-bold text-white underline-offset-4 hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </dialog>
    </main>
  );
}
