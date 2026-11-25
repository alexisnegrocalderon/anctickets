/**
 * ANC Tickets — portada como web de una app instalable: celular 3D en CSS que
 * flota en el hero, cuatro escenas animadas al hacer scroll (cada una con su
 * pantalla en HTML/CSS), video de Hyperframes, precio y preguntas. Oscuro
 * inmersivo; el único color de acción es el vermilion. Sin cifras ni logos
 * inventados: los datos del celular son de un evento de ejemplo.
 */
import Image from "next/image";
import Link from "next/link";
import AppScene from "@/components/app-scene";
import EventCarousel from "@/components/event-carousel";
import FaqAccordion from "@/components/faq-accordion";
import FeeCalculator from "@/components/fee-calculator";
import HeroSignup from "@/components/hero-signup";
import AmbassadorsScreen from "@/components/phone/ambassadors-screen";
import LiveSalesScreen from "@/components/phone/live-sales";
import Phone from "@/components/phone/phone";
import ScannerScreen from "@/components/phone/scanner-screen";
import WizardScreen from "@/components/phone/wizard-screen";
import PromoVideo from "@/components/promo-video";
import { InstallAppButton } from "@/components/pwa/install-app-button";
import ScrollReveal from "@/components/scroll-reveal";
import ScrollScenes from "@/components/scroll-scenes";
import { createClient } from "@/lib/supabase/server";
import type { Event } from "@/lib/database.types";

const trustPoints = [
  { titulo: "0% comisión de plataforma", detalle: "No descontamos nada de lo que vendes." },
  { titulo: "Pago directo a tu cuenta", detalle: "Cada venta cae en tu Mercado Pago, al instante." },
  { titulo: "Control de acceso con QR", detalle: "Tu staff escanea desde su propio teléfono." },
  { titulo: "Soporte en español", detalle: "Un equipo real, no un bot, cuando lo necesites." },
];

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
    <main className="min-h-screen overflow-x-clip bg-[var(--anc-bg)] text-white">
      <ScrollReveal />
      <ScrollScenes />

      {/* ---------------- NAV ---------------- */}
      <header className="anc-header-material sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-8 lg:px-12">
          <Link href="/" className="flex min-h-11 items-center gap-2" aria-label="ANC Tickets, inicio">
            <Image src="/anc-mark.png" alt="" width={28} height={28} priority />
            <span className="font-display text-xl uppercase text-white">ANC Tickets</span>
          </Link>

          <nav className="hidden items-center gap-8 font-mono text-xs font-bold uppercase tracking-[.14em] text-white/60 md:flex">
            <a href="#crear" className="transition-colors hover:text-white">Cómo funciona</a>
            <a href="#video" className="transition-colors hover:text-white">Video</a>
            <a href="#reparto" className="transition-colors hover:text-white">Precio</a>
            <a href="#preguntas" className="transition-colors hover:text-white">Preguntas</a>
          </nav>

          <Link
            href={loggedIn ? "/dashboard/events" : "/login"}
            className="inline-flex min-h-11 items-center rounded-full border border-white/25 px-5 text-sm font-bold text-white transition-colors duration-200 hover:border-white hover:bg-white/10"
          >
            {loggedIn ? "Mis eventos" : "Ya tengo cuenta"}
          </Link>
        </div>
      </header>

      {/* ---------------- HERO ---------------- */}
      <section className="relative isolate overflow-hidden">
        <div className="anc-lights -z-10" aria-hidden="true">
          <div className="anc-light anc-light-a" />
          <div className="anc-light anc-light-b" />
          <div className="anc-light anc-light-c" />
        </div>

        <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 text-center sm:px-8 lg:pb-24">
          <Phone mode="hero" label="Celular con el panel de ventas de un evento de ejemplo, Noche Neón">
            <LiveSalesScreen variant="full" />
          </Phone>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[.18em] text-white/60">
            Evento de ejemplo · datos ficticios
          </p>

          <h1 className="mx-auto mt-6 max-w-4xl text-[clamp(2.8rem,12vw,6.5rem)] uppercase leading-[.92] text-white">
            Toda tu ticketera en{" "}
            <span className="text-[var(--anc-vermilion)]">la palma de tu mano</span>
          </h1>
          <p className="mx-auto mt-5 max-w-[52ch] text-base sm:text-lg leading-7 text-white/80">
            Webapp que se instala en tu celular: crea eventos, mira las ventas en vivo, controla
            la puerta y cobra directo en tu Mercado Pago.
          </p>

          <div id="hero-cta" className="mx-auto mt-8 flex w-full max-w-sm scroll-mt-24 flex-col gap-3 sm:max-w-xl sm:flex-row">
            <InstallAppButton variant="primary" className="w-full sm:flex-1" />
            <div className="w-full sm:flex-1">
              <HeroSignup compact loggedIn={loggedIn} variant="ghost" />
            </div>
          </div>
          <p className="mt-4 text-sm text-[var(--anc-muted-text)]">
            Publicar es gratis. Entras con tu cuenta de Google, sin tarjeta de crédito.
          </p>
        </div>
      </section>

      {/* Franja de confianza. */}
      <div className="border-y border-[var(--anc-border)] px-4 py-10 sm:px-8 lg:px-12">
        <dl className="mx-auto grid max-w-6xl grid-cols-1 gap-x-8 gap-y-6 min-[480px]:grid-cols-2 lg:grid-cols-4">
          {trustPoints.map((point) => (
            <div key={point.titulo} className="reveal">
              <dt className="text-sm font-black leading-5 text-white">{point.titulo}</dt>
              <dd className="mt-1 text-sm leading-5 text-[var(--anc-muted-text)]">{point.detalle}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* ---------------- ESCENAS ---------------- */}
      <AppScene
        id="crear"
        eyebrow="01 · Crear"
        title={<>Crea tu evento <span className="text-[var(--anc-vermilion)]">en 2 minutos.</span></>}
        body="Un asistente paso a paso: nombre, fecha y entradas. Al terminar, tu evento queda publicado con su propio link para compartir."
        label="Celular con el asistente para crear un evento, paso a paso"
      >
        <WizardScreen />
      </AppScene>

      <AppScene
        eyebrow="02 · Vender"
        title={<>Ventas <span className="text-[var(--anc-vermilion)]">en vivo.</span></>}
        body="Cada entrada vendida te llega como notificación. Mira subir los ingresos y la barra de entradas vendidas sin recargar nada."
        label="Celular con notificaciones de venta y el contador de ingresos subiendo"
        reverse
      >
        <LiveSalesScreen variant="full" />
      </AppScene>

      <AppScene
        eyebrow="03 · Controlar"
        title={<>Escáner QR <span className="text-[var(--anc-vermilion)]">en la puerta.</span></>}
        body="Tu staff valida desde su propio teléfono: la entrada aparece VÁLIDA en verde y el contador de ingresados sube. Un código ya usado no vuelve a entrar."
        label="Celular escaneando un QR: la entrada aparece VÁLIDA en verde y sube el contador de ingresados"
      >
        <ScannerScreen />
      </AppScene>

      <AppScene
        eyebrow="04 · Crecer"
        title={<>Embajadores <span className="text-[var(--anc-vermilion)]">y descuentos.</span></>}
        body="Dale un código a tus embajadores y mira quién vende más. El dinero va directo a tu Mercado Pago, sin cuenta intermedia."
        label="Celular con el ranking de embajadores, un código de descuento y el pago directo a Mercado Pago"
        reverse
      >
        <AmbassadorsScreen />
      </AppScene>

      {/* ---------------- VIDEO ---------------- */}
      <section id="video" className="px-4 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-mono text-xs font-black uppercase tracking-[.2em] text-[var(--anc-vermilion)]">
            Mírala en acción
          </p>
          <h2 className="mt-3 text-[clamp(2.4rem,6vw,4.2rem)] uppercase leading-[.98] text-white">
            Así se ve ANC Tickets en tu celular.
          </h2>
        </div>
        <div className="mt-10">
          <PromoVideo />
        </div>
      </section>

      {/* ---------------- REPARTO / PRECIO ---------------- */}
      <section id="reparto" className="px-4 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-mono text-xs font-black uppercase tracking-[.2em] text-[var(--anc-vermilion)]">
            Precio, sin letra chica
          </p>
          <h2 className="mt-3 text-[clamp(2.4rem,6vw,4.2rem)] uppercase leading-[.98] text-white">
            Así se reparte cada entrada que vendes.
          </h2>
          <p className="mx-auto mt-5 max-w-[56ch] text-base leading-7 text-[var(--anc-muted-text)]">
            Prueba con el precio real de tu entrada. El 100% de lo que publicas cae en tu cuenta;
            el cargo de servicio lo paga quien compra.
          </p>
        </div>
        <div className="reveal mx-auto mt-12 max-w-2xl">
          <FeeCalculator />
        </div>
      </section>

      {/* ---------------- CARRUSEL DE FECHAS ---------------- */}
      {proximasFechas.length > 0 ? (
        <section className="bg-[var(--anc-surface)] py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-8 lg:px-12">
            <h2 className="text-[clamp(2.4rem,6vw,4.2rem)] uppercase leading-[.98] text-white">
              Fechas publicadas con ANC.
            </h2>
          </div>
          <div className="mt-10 pl-4 sm:pl-8 lg:pl-12">
            <EventCarousel events={proximasFechas} />
          </div>
        </section>
      ) : null}

      {/* ---------------- FAQ ---------------- */}
      <section id="preguntas" className="px-4 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-xs font-black uppercase tracking-[.2em] text-[var(--anc-vermilion)]">
            Preguntas frecuentes
          </p>
          <h2 className="mt-3 text-[clamp(2.4rem,6vw,4.2rem)] uppercase leading-[.98] text-white">
            Lo que preguntan antes de publicar.
          </h2>
          <div className="mt-10">
            <FaqAccordion />
          </div>
        </div>
      </section>

      {/* ---------------- CIERRE ---------------- */}
      <section className="px-4 pb-20 sm:px-8 lg:px-12 lg:pb-28">
        <div className="reveal relative isolate mx-auto max-w-5xl overflow-hidden rounded-[32px] border border-[var(--anc-border)] bg-[var(--anc-surface)] px-6 py-16 text-center sm:px-16 sm:py-20">
          <div className="anc-lights -z-10" aria-hidden="true">
            <div className="anc-light anc-light-a" />
          </div>
          <h2 className="text-[clamp(2.8rem,8vw,5.5rem)] uppercase leading-[.95] text-white">
            Instala ANC Tickets
            <br />
            y publica hoy.
          </h2>
          <div className="mx-auto mt-10 flex max-w-sm flex-col gap-3">
            <InstallAppButton variant="primary" className="w-full" />
            <HeroSignup compact loggedIn={loggedIn} variant="ghost" />
          </div>
        </div>
      </section>

      <footer className="px-4 pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:px-8 lg:px-12">
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
    </main>
  );
}
