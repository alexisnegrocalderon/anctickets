/**
 * ANC Tickets — portada de una app instalable: video de fondo en el hero con el
 * titular encima, cinta de funciones, beneficios y una escena sticky donde un
 * celular fijo cambia de pantalla entre las 4 funciones, precio y preguntas. Estilo
 * cristal sobre fondo oscuro; el único color de acción es el vermilion. Sin
 * cifras ni logos inventados: los datos del celular son de un evento de ejemplo.
 */
import Image from "next/image";
import Link from "next/link";
import BenefitCards from "@/components/benefit-cards";
import EventCarousel from "@/components/event-carousel";
import FaqAccordion from "@/components/faq-accordion";
import FeatureMarquee from "@/components/feature-marquee";
import FeatureStage from "@/components/feature-stage";
import FeeCalculator from "@/components/fee-calculator";
import HeroSignup from "@/components/hero-signup";
import HeroVideo from "@/components/hero-video";
import ImmersiveFx from "@/components/immersive-fx";
import InstallBar from "@/components/install-bar";
import { InstallAppButton } from "@/components/pwa/install-app-button";
import RevealHeading from "@/components/reveal-heading";
import ScrollReveal from "@/components/scroll-reveal";
import { createClient } from "@/lib/supabase/server";
import type { Event } from "@/lib/database.types";

export default async function Home() {
  const supabase = await createClient();
  const [{ data: events }, { data: authData }] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .eq("status", "published")
      .order("event_date", { ascending: true })
      .returns<Event[]>(),
    supabase.auth.getUser(),
  ]);
  const loggedIn = !!authData?.user;

  const proximasFechas = (events ?? []).slice(0, 8);

  return (
    <main className="relative isolate min-h-screen overflow-x-clip bg-[var(--anc-bg)] text-white">
      <ScrollReveal />
      <ImmersiveFx />
      <div className="fx-lights" aria-hidden="true">
        <div className="fx-light fx-light-a" />
        <div className="fx-light fx-light-b" />
        <div className="fx-light fx-light-c" />
      </div>
      <div className="fx-grain" aria-hidden="true" />

      {/* ---------------- NAV: píldora de cristal flotante ---------------- */}
      <header className="hdr glass" data-glow>
        <Link href="/" className="flex min-h-11 items-center gap-2" aria-label="ANC Tickets, inicio">
          <Image src="/anc-mark.png" alt="" width={26} height={26} priority />
          <span className="font-display text-lg uppercase text-white sm:text-xl">ANC Tickets</span>
        </Link>

        <nav className="hidden items-center gap-7 font-mono text-xs font-bold uppercase tracking-[.14em] text-white/70 md:flex">
          <a href="#crear" className="transition-colors hover:text-white">Cómo funciona</a>
          <a href="#reparto" className="transition-colors hover:text-white">Precio</a>
          <a href="#preguntas" className="transition-colors hover:text-white">Preguntas</a>
        </nav>

        <Link href={loggedIn ? "/dashboard/events" : "/login"} className="hdr-cta" data-glow>
          {loggedIn ? "Mis eventos" : "Ya tengo cuenta"}
        </Link>
      </header>

      {/* ---------------- HERO: video de fondo; texto abajo en celular, centrado en escritorio ---------------- */}
      <section id="hero" className="hero relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden lg:justify-center">
        <HeroVideo />
        <div className="hero-scrim" aria-hidden="true" />

        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-5 pt-24 sm:px-8 md:pb-8 md:pt-32 lg:px-12 lg:pb-24 lg:pt-28">
          <h1 className="max-w-4xl text-[clamp(1.95rem,9vw,5.6rem)] uppercase leading-[.93] text-white [text-shadow:0_2px_24px_rgba(0,0,0,.55)]">
            Todo tu evento en{" "}
            <span className="text-[var(--anc-vermilion)]">la palma de tu mano</span>
          </h1>
          <p className="mt-3 max-w-[52ch] text-[0.95rem] leading-6 text-white/95 [text-shadow:0_1px_12px_rgba(0,0,0,.6)] sm:mt-4 sm:text-lg sm:leading-7">
            <span className="sm:hidden">Webapp instalable: vende entradas, mira las ventas en vivo y cobra en tu Mercado Pago.</span>
            <span className="hidden sm:inline">
              Webapp que se instala en tu celular: vende entradas, mira las ventas en vivo, controla
              la puerta y cobra directo en tu Mercado Pago.
            </span>
          </p>

          <div id="hero-cta" className="mt-4 flex w-full max-w-sm scroll-mt-24 flex-col gap-2.5 sm:mt-6 sm:max-w-xl sm:flex-row sm:gap-3">
            <InstallAppButton variant="glass" className="w-full sm:flex-1" />
            <div className="w-full sm:flex-1">
              <HeroSignup compact loggedIn={loggedIn} variant="ghost" />
            </div>
          </div>
          <p className="mt-3 hidden text-sm text-white/70 md:block">
            Publicar es gratis. Entras con tu cuenta de Google, sin tarjeta de crédito.
          </p>
        </div>
      </section>

      <FeatureMarquee />
      <BenefitCards />

      {/* ---------------- FUNCIONES: celular sticky ---------------- */}
      <FeatureStage />

      {/* ---------------- REPARTO / PRECIO ---------------- */}
      <section id="reparto" className="relative z-[1] px-4 py-10 sm:px-8 sm:py-14 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-mono text-xs font-black uppercase tracking-[.2em] text-[var(--anc-vermilion)]">
            Precio, sin letra chica
          </p>
          <RevealHeading
            className="mt-3 text-[clamp(2.4rem,6vw,4.2rem)] uppercase leading-[.98] text-white"
            parts={[{ t: "Así se reparte cada entrada que vendes." }]}
          />
          <p className="mx-auto mt-5 max-w-[56ch] text-base leading-7 text-[var(--anc-muted-text)]">
            Prueba con el precio real de tu entrada. El 100% de lo que publicas cae en tu cuenta;
            el cargo de servicio lo paga quien compra.
          </p>
        </div>
        <div className="reveal mx-auto mt-7 max-w-2xl sm:mt-10">
          <FeeCalculator />
        </div>
      </section>

      {/* ---------------- CARRUSEL DE FECHAS ---------------- */}
      {proximasFechas.length > 0 ? (
        <section className="relative z-[1] bg-[var(--anc-surface)] py-10 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-8 lg:px-12">
            <RevealHeading
              className="text-[clamp(2.4rem,6vw,4.2rem)] uppercase leading-[.98] text-white"
              parts={[{ t: "Fechas publicadas con ANC." }]}
            />
          </div>
          <div className="mt-8 pl-4 sm:pl-8 lg:pl-12">
            <EventCarousel events={proximasFechas} />
          </div>
        </section>
      ) : null}

      {/* ---------------- FAQ ---------------- */}
      <section id="preguntas" className="relative z-[1] px-4 py-10 sm:px-8 sm:py-14 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-xs font-black uppercase tracking-[.2em] text-[var(--anc-vermilion)]">
            Preguntas frecuentes
          </p>
          <RevealHeading
            className="mt-3 text-[clamp(2.4rem,6vw,4.2rem)] uppercase leading-[.98] text-white"
            parts={[{ t: "Lo que preguntan antes de publicar." }]}
          />
          <div className="mt-8">
            <FaqAccordion />
          </div>
        </div>
      </section>

      {/* ---------------- CIERRE ---------------- */}
      <section id="cierre" className="relative z-[1] px-4 pb-10 sm:px-8 sm:pb-14 lg:px-12 lg:pb-24">
        <div className="reveal glass relative mx-auto max-w-5xl px-6 py-10 text-center sm:px-16 sm:py-20" style={{ ["--gr" as string]: "32px" }} data-glow>
          <RevealHeading
            className="text-[clamp(2.8rem,8vw,5.5rem)] uppercase leading-[.95] text-white"
            parts={[{ t: "Instala ANC Tickets y publica hoy." }]}
          />
          <div className="mx-auto mt-9 flex max-w-sm flex-col gap-3">
            <InstallAppButton variant="glass" className="w-full" />
            <HeroSignup compact loggedIn={loggedIn} variant="ghost" />
          </div>
        </div>
      </section>

      <footer className="relative z-[1] px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 border-t border-[var(--anc-border)] pt-8 text-sm text-[var(--anc-muted-text)] sm:flex-row sm:items-center sm:justify-between">
          <p>ANC Tickets · Chile</p>
          <nav className="flex gap-5">
            <Link href="/privacidad" className="inline-flex min-h-11 items-center underline decoration-[var(--anc-vermilion)] decoration-2 underline-offset-4 hover:text-white">
              Privacidad
            </Link>
            <Link href="/terminos" className="inline-flex min-h-11 items-center underline decoration-[var(--anc-vermilion)] decoration-2 underline-offset-4 hover:text-white">
              Términos
            </Link>
          </nav>
          <p className="max-w-md text-xs leading-5 sm:text-right">
            ANC no cobra comisión de plataforma al organizador. El comprador paga un cargo por
            servicio del 10%, del que se descuenta el procesamiento de Mercado Pago.
          </p>
        </div>
      </footer>

      <InstallBar loggedIn={loggedIn} />
    </main>
  );
}
