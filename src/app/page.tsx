/**
 * ANC Tickets — portada oscura e inmersiva: tres luces que derivan muy lento
 * (CSS puro, apagadas con prefers-reduced-motion), titular gigante en Anton y
 * una sola acción de color: "Publicar mi evento gratis". Sin video ni imágenes
 * externas, para que cargue rápido.
 */
import Image from "next/image";
import Link from "next/link";
import EventCarousel from "@/components/event-carousel";
import FaqAccordion from "@/components/faq-accordion";
import FeeCalculator from "@/components/fee-calculator";
import HeroSignup from "@/components/hero-signup";
import ImpactSection from "@/components/impact-section";
import Methodology from "@/components/methodology";
import PlaybookGrid from "@/components/playbook-grid";
import ScrollReveal from "@/components/scroll-reveal";
import { createClient } from "@/lib/supabase/server";
import type { Event } from "@/lib/database.types";

const trustPoints = [
  { titulo: "0% comisión de plataforma", detalle: "No descontamos nada de lo que vendes." },
  { titulo: "Pago directo a tu cuenta", detalle: "Cada venta cae en tu Mercado Pago, al instante." },
  { titulo: "Control de acceso con QR", detalle: "Tu staff escanea desde su propio teléfono." },
  { titulo: "Soporte en español", detalle: "Un equipo real, no un bot, cuando lo necesites." },
];

const playbook = [
  { title: "Conexión con Mercado Pago", spec: "Conectas tu cuenta en un toque, desde el panel." },
  { title: "Creación de evento", spec: "Un asistente por pasos, con vista previa en vivo de tu página." },
  { title: "Panel de ventas", spec: "Recaudación, entradas vendidas y quiénes ya ingresaron." },
  { title: "Escáner de acceso", spec: "Tu staff valida los QR desde su propio teléfono." },
  { title: "Link propio del evento", spec: "Una página lista para compartir en tu historia." },
  { title: "Entrada con QR", spec: "Cada comprador recibe su entrada digital por correo." },
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

      {/* ---------------- NAV ---------------- */}
      <header className="anc-header-material sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-8 lg:px-12">
          <Link href="/" className="flex min-h-11 items-center gap-2" aria-label="ANC Tickets, inicio">
            <Image src="/anc-mark.png" alt="" width={28} height={28} priority />
            <span className="font-display text-xl uppercase text-white">ANC Tickets</span>
          </Link>

          <nav className="hidden items-center gap-8 font-mono text-xs font-bold uppercase tracking-[.14em] text-white/60 md:flex">
            <a href="#playbook" className="transition-colors hover:text-white">Playbook</a>
            <a href="#metodologia" className="transition-colors hover:text-white">Metodología</a>
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
      <section className="relative isolate flex min-h-[calc(100svh-4.5rem)] items-center overflow-hidden">
        <div className="anc-lights -z-10" aria-hidden="true">
          <div className="anc-light anc-light-a" />
          <div className="anc-light anc-light-b" />
          <div className="anc-light anc-light-c" />
        </div>

        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-8 lg:px-12">
          <p className="font-mono text-[11px] font-black uppercase tracking-[.22em] text-white/70 sm:text-xs">
            La ticketera de los productores chilenos
          </p>
          <h1 className="mt-5 max-w-5xl text-[clamp(3.2rem,15vw,11rem)] uppercase leading-[.9] text-white">
            Vende tus entradas.
            <br />
            <span className="text-[var(--anc-vermilion)]">Cobra directo.</span>
          </h1>
          <p className="mt-7 max-w-[52ch] text-lg leading-7 text-white/80">
            Publica tu evento, comparte el link y recibe cada venta en tu propia cuenta de
            Mercado Pago. Sin comisión de plataforma, sin cuenta intermedia.
          </p>
          <div id="hero-cta" className="mt-9 scroll-mt-24">
            <HeroSignup loggedIn={loggedIn} />
          </div>
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

      {/* ---------------- QUIEBRE #1 ---------------- */}
      <ImpactSection tone="surface">
        <h2 className="text-[clamp(3rem,12vw,9rem)] uppercase leading-[.9] text-white">
          Cero comisión
          <br />
          <span className="text-[var(--anc-vermilion)]">de plataforma.</span>
        </h2>
      </ImpactSection>

      {/* ---------------- PLAYBOOK ---------------- */}
      <section id="playbook" className="px-4 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-mono text-xs font-black uppercase tracking-[.2em] text-[var(--anc-vermilion)]">
            Nuestro playbook
          </p>
          <h2 className="mt-3 text-[clamp(2.4rem,6vw,4.2rem)] uppercase leading-[.98] text-white">
            Todo lo que necesitas para vender.
          </h2>
        </div>
        <div className="mx-auto mt-12 max-w-6xl">
          <PlaybookGrid items={playbook} />
        </div>
      </section>

      {/* ---------------- METODOLOGÍA ---------------- */}
      <section id="metodologia" className="px-4 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-mono text-xs font-black uppercase tracking-[.2em] text-[var(--anc-vermilion)]">
            Metodología
          </p>
          <h2 className="mt-3 text-[clamp(2.4rem,6vw,4.2rem)] uppercase leading-[.98] text-white">
            De la idea a la venta, en seis pasos.
          </h2>
        </div>
        <div className="mx-auto mt-12 max-w-4xl">
          <Methodology />
        </div>
      </section>

      {/* ---------------- QUIEBRE #2 ---------------- */}
      <ImpactSection>
        <h2 className="text-[clamp(3rem,12vw,9rem)] uppercase leading-[.9] text-white">
          Tu plata,
          <br />
          <span className="text-[var(--anc-vermilion)]">tu cuenta.</span>
        </h2>
      </ImpactSection>

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
            Tu próxima fecha,
            <br />
            publicada hoy.
          </h2>
          <div className="mx-auto mt-10 max-w-sm">
            <HeroSignup compact loggedIn={loggedIn} />
          </div>
        </div>
      </section>

      <footer className="px-4 pb-14 sm:px-8 lg:px-12">
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
