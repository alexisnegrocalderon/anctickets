/**
 * ANC Tickets — home editorial de agencia, estructura inspirada en
 * loveandmoney.com: hero de impacto, quiebres de pantalla completa,
 * "playbook" en grilla, metodología numerada 01-06 y carrusel horizontal de
 * casos — con la conversión (CTA, calculadora de reparto, FAQ) integrada
 * dentro de ese formato en vez de una landing de SaaS convencional.
 *
 * La paleta de color sigue siendo la provisoria "Doughlicious": el usuario
 * va a mandar una referencia de color nueva para esta estructura, así que
 * los tokens en brand.css son lo único que hay que tocar cuando llegue.
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

const heroVideo = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663820533004/GbHXpGORdFcoZgeV.mp4";
const heroPoster = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663820533004/tmjnuDhpwrWwdDyk.jpg";

const trustPoints = [
  { titulo: "0% comisión de plataforma", detalle: "No descontamos nada de lo que vendes." },
  { titulo: "Pago directo a tu cuenta", detalle: "Cada venta cae en tu Mercado Pago, al instante." },
  { titulo: "Control de acceso con QR", detalle: "Tu staff escanea desde su propio teléfono." },
  { titulo: "Soporte en español", detalle: "Un equipo real, no un bot, cuando lo necesites." },
];

const playbook = [
  { title: "Conexión con Mercado Pago", label: "Captura: Mercado Pago", spec: "Flujo OAuth dentro del panel." },
  { title: "Creación de evento", label: "Captura: wizard", spec: "Formulario con vista previa en vivo." },
  { title: "Dashboard de ventas", label: "Captura: dashboard", spec: "Resumen de ventas y recaudación." },
  { title: "Escáner de acceso", label: "Captura: escáner QR", spec: "El teléfono del staff en la puerta." },
  { title: "Link propio del evento", label: "Captura: página pública", spec: "La página del evento, lista para compartir." },
  { title: "Entrada con QR", label: "Captura: entrada digital", spec: "El talonario digital que recibe el comprador." },
];

export default async function Home() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .order("event_date", { ascending: true })
    .returns<Event[]>();

  const proximasFechas = (events ?? []).slice(0, 8);

  return (
    <main className="min-h-screen bg-[var(--anc-bg)] text-[var(--anc-ink)]">
      <ScrollReveal />

      {/* ---------------- NAV ---------------- */}
      <header className="sticky top-0 z-50 border-b border-[var(--anc-ink)]/10 bg-[var(--anc-violet)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-12">
          <Link href="/" className="flex items-center gap-2" aria-label="ANC Tickets, inicio">
            <Image src="/anc-mark.png" alt="" width={26} height={26} priority />
            <span className="font-display text-xl font-black tracking-tight text-[var(--anc-ink)]">ANC Tickets</span>
          </Link>

          <nav className="hidden items-center gap-8 font-mono text-xs font-bold uppercase tracking-[.14em] text-[var(--anc-ink)]/70 md:flex">
            <a href="#playbook" className="transition-colors hover:text-[var(--anc-ink)]">Playbook</a>
            <a href="#metodologia" className="transition-colors hover:text-[var(--anc-ink)]">Metodología</a>
            <a href="#reparto" className="transition-colors hover:text-[var(--anc-ink)]">Precio</a>
            <a href="#preguntas" className="transition-colors hover:text-[var(--anc-ink)]">Preguntas</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden text-sm font-bold text-[var(--anc-ink)]/70 transition-colors hover:text-[var(--anc-ink)] sm:block"
            >
              Ya tengo cuenta
            </Link>
            <a
              href="#hero-cta"
              className="rounded-full bg-[var(--anc-yellow)] px-5 py-2.5 text-sm font-black uppercase tracking-tight text-[var(--anc-ink)] transition-transform duration-150 hover:brightness-95 active:scale-95"
            >
              Publica gratis
            </a>
          </div>
        </div>
      </header>

      {/* ---------------- HERO DE IMPACTO ---------------- */}
      <ImpactSection video={heroVideo} poster={heroPoster} bg="var(--anc-ink)">
        <p className="font-mono text-xs font-black uppercase tracking-[.24em] text-white/70">
          La ticketera de los productores chilenos
        </p>
        <h1 className="font-display mx-auto mt-5 max-w-4xl text-[clamp(2.8rem,9vw,7rem)] font-black leading-[.92] text-white">
          Vende tus entradas.
          <br />
          Cobra directo.
        </h1>
        <p className="mx-auto mt-7 max-w-[52ch] text-lg leading-7 text-white/80">
          Publica tu evento, comparte el link y recibe cada venta en tu propia cuenta de
          Mercado Pago. Sin comisión de plataforma, sin cuenta intermedia.
        </p>
        <div id="hero-cta" className="mx-auto mt-9 flex max-w-sm justify-center scroll-mt-24">
          <HeroSignup />
        </div>
      </ImpactSection>

      {/* Franja de confianza, justo debajo del impacto del hero. */}
      <div className="bg-white px-5 py-10 sm:px-8 lg:px-12">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
          {trustPoints.map((point) => (
            <div key={point.titulo} className="reveal">
              <dt className="text-sm font-black leading-5 text-[var(--anc-ink)]">{point.titulo}</dt>
              <dd className="mt-1 text-xs leading-4 text-[var(--anc-ink-muted)]">{point.detalle}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* ---------------- QUIEBRE DE IMPACTO #1 ---------------- */}
      <ImpactSection bg="var(--anc-cerise)">
        <h2 className="font-display text-[clamp(2.8rem,10vw,8rem)] font-black leading-[.9] text-white">
          Cero comisión
          <br />
          de plataforma.
        </h2>
      </ImpactSection>

      {/* ---------------- PLAYBOOK ---------------- */}
      <section id="playbook" className="bg-[var(--anc-cream)] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-mono text-xs font-black uppercase tracking-[.2em] text-[var(--anc-cerise-deep)]">
            Nuestro playbook
          </p>
          <h2 className="font-display mt-3 text-[clamp(2rem,4.6vw,3.4rem)] font-black leading-[.98] text-[var(--anc-ink)]">
            Todo lo que necesitas para vender.
          </h2>
        </div>
        <div className="mx-auto mt-14 max-w-6xl">
          <PlaybookGrid items={playbook} />
        </div>
      </section>

      {/* ---------------- METODOLOGÍA ---------------- */}
      <section id="metodologia" className="bg-white px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-mono text-xs font-black uppercase tracking-[.2em] text-[var(--anc-violet-deep)]">
            Metodología
          </p>
          <h2 className="font-display mt-3 text-[clamp(2rem,4.6vw,3.4rem)] font-black leading-[.98] text-[var(--anc-ink)]">
            De la idea a la venta, en seis pasos.
          </h2>
        </div>
        <div className="mx-auto mt-14 max-w-4xl">
          <Methodology />
        </div>
      </section>

      {/* ---------------- QUIEBRE DE IMPACTO #2 ---------------- */}
      <ImpactSection bg="var(--anc-violet)">
        <h2 className="font-display text-[clamp(2.8rem,10vw,8rem)] font-black leading-[.9] text-[var(--anc-ink)]">
          Tu plata,
          <br />
          tu cuenta.
        </h2>
      </ImpactSection>

      {/* ---------------- REPARTO / PRECIO ---------------- */}
      <section id="reparto" className="bg-white px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-mono text-xs font-black uppercase tracking-[.2em] text-[var(--anc-violet-deep)]">
            Precio, sin letra chica
          </p>
          <h2 className="font-display mt-3 text-[clamp(2rem,4.6vw,3.4rem)] font-black leading-[.98] text-[var(--anc-ink)]">
            Así se reparte cada entrada que vendes.
          </h2>
          <p className="mx-auto mt-5 max-w-[56ch] text-base leading-7 text-[var(--anc-ink-muted)]">
            Prueba con el precio real de tu entrada. El 100% de lo que publicas cae en tu cuenta;
            el cargo de servicio lo paga quien compra.
          </p>
        </div>
        <div className="mx-auto mt-12 max-w-2xl reveal">
          <FeeCalculator />
        </div>
      </section>

      {/* ---------------- CARRUSEL DE FECHAS ---------------- */}
      {proximasFechas.length > 0 ? (
        <section className="bg-[var(--anc-ink)] py-24 sm:py-32">
          <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-12">
            <h2 className="font-display text-[clamp(2rem,4.6vw,3.4rem)] font-black leading-[.98] text-white">
              Fechas publicadas con ANC.
            </h2>
          </div>
          <div className="mt-12 pl-5 sm:pl-8 lg:pl-12">
            <EventCarousel events={proximasFechas} />
          </div>
        </section>
      ) : null}

      {/* ---------------- FAQ ---------------- */}
      <section id="preguntas" className="bg-[var(--anc-cream)] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-xs font-black uppercase tracking-[.2em] text-[var(--anc-cerise-deep)]">
            Preguntas frecuentes
          </p>
          <h2 className="font-display mt-3 text-[clamp(2rem,4.6vw,3.4rem)] font-black leading-[.98] text-[var(--anc-ink)]">
            Lo que preguntan antes de publicar.
          </h2>
          <div className="mt-12">
            <FaqAccordion />
          </div>
        </div>
      </section>

      {/* ---------------- CIERRE ---------------- */}
      <section className="bg-white px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="reveal mx-auto max-w-5xl rounded-[32px] bg-[var(--anc-cerise)] px-8 py-16 text-center sm:px-16 sm:py-20">
          <h2 className="font-display text-[clamp(2.4rem,6vw,4.4rem)] font-black leading-[.96] text-white">
            Tu próxima fecha,
            <br />
            publicada hoy.
          </h2>
          <div className="mt-10 flex justify-center">
            <HeroSignup compact muted />
          </div>
        </div>
      </section>

      <footer className="bg-white px-5 pb-14 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 border-t border-[var(--anc-border)] pt-8 text-sm text-[var(--anc-ink-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>ANC Tickets · Chile</p>
          <nav className="flex gap-5">
            <Link href="/privacidad" className="underline decoration-[var(--anc-cerise)] decoration-2 underline-offset-4 hover:text-[var(--anc-ink)]">
              Privacidad
            </Link>
            <Link href="/terminos" className="underline decoration-[var(--anc-cerise)] decoration-2 underline-offset-4 hover:text-[var(--anc-ink)]">
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
