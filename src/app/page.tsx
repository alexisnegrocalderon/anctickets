/**
 * ANC Tickets — home de conversión para productores.
 * Estructura de captación (hero + CTA, beneficios, cómo funciona, prueba de
 * reparto, funcionalidades, FAQ, CTA final) vestida con la identidad
 * "Indigo & Lima": fondo blanco, texto en índigo oscuro, lima como acento de
 * acción y violeta suave como acento de confianza. Sin prueba social
 * inventada: el producto está en pre-lanzamiento, así que en vez de logos o
 * testimonios falsos mostramos el reparto real de la plata.
 */
import Image from "next/image";
import Link from "next/link";
import AssetPlaceholder from "@/components/asset-placeholder";
import FaqAccordion from "@/components/faq-accordion";
import FeeCalculator from "@/components/fee-calculator";
import HeroSignup from "@/components/hero-signup";
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

const beneficios = [
  {
    tag: "Vende sin intermediarios",
    titulo: "Tu plata no pasa por nosotros.",
    detalle:
      "No existe una cuenta intermedia de ANC donde tu dinero espere a que alguien lo libere. Conectas tu propia cuenta de Mercado Pago y cada venta llega ahí directo, apenas se confirma el pago.",
    placeholder: { label: "Captura: conexión con Mercado Pago", spec: "Pantalla del flujo OAuth de Mercado Pago dentro del panel, 1200×860px aprox." },
    ink: "var(--anc-lime-deep)",
  },
  {
    tag: "Arma tu evento en minutos",
    titulo: "De la idea a la venta, en una sentada.",
    detalle:
      "Nombre, fecha, lugar, tipos de entrada y precio. Sin plantillas rígidas ni pasos de más: publicas y compartes el link en tu historia el mismo rato.",
    placeholder: { label: "Captura: formulario de creación de evento", spec: "Pantalla del wizard de creación con la vista previa en vivo, 1200×860px aprox." },
    ink: "var(--anc-purple-deep)",
  },
  {
    tag: "La puerta también es tuya",
    titulo: "Cada entrada, con su propio QR.",
    detalle:
      "Tu staff escanea desde su propio teléfono con acceso a tu evento. Un código ya usado no vuelve a entrar, y ves el flujo de gente en tiempo real.",
    placeholder: { label: "Captura: escáner de acceso en el teléfono", spec: "Foto o mockup del celular escaneando un QR en la puerta, formato vertical 900×1200px." },
    ink: "var(--anc-lime-deep)",
  },
];

const pasos = [
  {
    numero: "01",
    titulo: "Crea tu cuenta",
    detalle: "Entras con Google. Sin formularios eternos, sin tarjeta de crédito.",
  },
  {
    numero: "02",
    titulo: "Conecta Mercado Pago",
    detalle: "La cuenta de tu organización, la que tú ya usas para cobrar.",
  },
  {
    numero: "03",
    titulo: "Publica y comparte",
    detalle: "Tu evento queda con un link propio, listo para tu historia.",
  },
];

export default async function Home() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .order("event_date", { ascending: true })
    .returns<Event[]>();

  const proximasFechas = (events ?? []).slice(0, 6);

  return (
    <main className="min-h-screen bg-[var(--anc-bg)] text-[var(--anc-ink)]">
      <ScrollReveal />

      {/* ---------------- NAV ---------------- */}
      <header className="sticky top-0 z-50 border-b border-[var(--anc-border)] bg-[var(--anc-bg)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-12">
          <Link href="/" className="flex items-center gap-2" aria-label="ANC Tickets, inicio">
            <Image src="/anc-mark.png" alt="" width={26} height={26} priority />
            <span className="font-display text-xl font-black tracking-tight">ANC Tickets</span>
          </Link>

          <nav className="hidden items-center gap-8 font-mono text-xs font-bold uppercase tracking-[.14em] text-[var(--anc-ink-muted)] md:flex">
            <a href="#beneficios" className="transition-colors hover:text-[var(--anc-ink)]">Beneficios</a>
            <a href="#como-funciona" className="transition-colors hover:text-[var(--anc-ink)]">Cómo funciona</a>
            <a href="#reparto" className="transition-colors hover:text-[var(--anc-ink)]">Precio</a>
            <a href="#preguntas" className="transition-colors hover:text-[var(--anc-ink)]">Preguntas</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden text-sm font-bold text-[var(--anc-ink-muted)] transition-colors hover:text-[var(--anc-ink)] sm:block"
            >
              Ya tengo cuenta
            </Link>
            <a
              href="#hero-cta"
              className="rounded-full bg-[var(--anc-lime)] px-5 py-2.5 text-sm font-black uppercase tracking-tight text-[var(--anc-ink)] transition-transform duration-150 hover:brightness-95 active:scale-95"
            >
              Publica gratis
            </a>
          </div>
        </div>
      </header>

      {/* ---------------- HERO ---------------- */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_55%_50%_at_15%_0%,rgba(192,132,252,.16),transparent_65%),radial-gradient(ellipse_50%_45%_at_100%_20%,rgba(163,230,53,.16),transparent_60%)]"
        />

        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-16 sm:px-8 lg:grid-cols-[1.1fr_.9fr] lg:px-12 lg:pb-28 lg:pt-24">
          <div id="hero-cta" className="reveal scroll-mt-24">
            <p className="font-mono text-xs font-black uppercase tracking-[.2em] text-[var(--anc-purple-deep)]">
              La ticketera de los productores chilenos
            </p>
            <h1 className="font-display mt-4 text-[clamp(2.6rem,6.4vw,5rem)] font-black leading-[.94] tracking-tight text-[var(--anc-ink)]">
              Vende tus entradas.
              <br />
              <span className="text-[var(--anc-lime-deep)]">Cobra directo.</span>
            </h1>
            <p className="mt-6 max-w-[46ch] text-lg leading-7 text-[var(--anc-ink-muted)]">
              Publica tu evento, comparte el link y recibe cada venta en la cuenta de Mercado
              Pago de tu organización. Sin comisión de plataforma, sin cuenta intermedia, sin
              esperar a que alguien te libere la plata.
            </p>

            <div className="mt-9">
              <HeroSignup />
            </div>

            <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-5 border-t border-[var(--anc-border)] pt-8 sm:grid-cols-4">
              {trustPoints.map((point) => (
                <div key={point.titulo}>
                  <dt className="text-sm font-black leading-5 text-[var(--anc-ink)]">{point.titulo}</dt>
                  <dd className="mt-1 text-xs leading-4 text-[var(--anc-ink-muted)]">{point.detalle}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="reveal relative" data-reveal-delay="120">
            <div className="relative overflow-hidden rounded-3xl border-2 border-[var(--anc-purple)]/40 shadow-[0_30px_60px_-30px_rgba(30,27,75,.4)]" style={{ aspectRatio: "4/5" }}>
              <video
                className="h-full w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                poster={heroPoster}
              >
                <source src={heroVideo} type="video/mp4" />
              </video>
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,rgba(30,27,75,.55)_100%)]" />
            </div>

            <div className="absolute -bottom-6 left-6 right-6 flex items-center gap-3 rounded-2xl border border-[var(--anc-border)] bg-white px-5 py-4 shadow-[0_20px_40px_-20px_rgba(30,27,75,.35)] sm:left-8 sm:right-auto sm:w-72">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--anc-lime-deep)]" aria-hidden="true" />
              <p className="text-sm font-bold leading-5 text-[var(--anc-ink)]">
                0% comisión de plataforma para el organizador
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- BENEFICIOS ---------------- */}
      <section id="beneficios" className="px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-mono text-xs font-black uppercase tracking-[.2em] text-[var(--anc-lime-deep)]">
            Por qué ANC
          </p>
          <h2 className="font-display mt-3 text-[clamp(2rem,4.6vw,3.4rem)] font-black leading-[.98] text-[var(--anc-ink)]">
            Hecha para quien produce, no para quien invierte.
          </h2>
        </div>

        <div className="mx-auto mt-16 flex max-w-6xl flex-col gap-20">
          {beneficios.map((item, index) => (
            <div
              key={item.titulo}
              className={`reveal grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${
                index % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
              }`}
            >
              <div>
                <p className="font-mono text-xs font-black uppercase tracking-[.18em]" style={{ color: item.ink }}>
                  {item.tag}
                </p>
                <h3 className="font-display mt-3 text-[clamp(1.7rem,3.4vw,2.6rem)] font-black leading-[1.02] text-[var(--anc-ink)]">
                  {item.titulo}
                </h3>
                <p className="mt-5 max-w-[52ch] text-base leading-7 text-[var(--anc-ink-muted)]">{item.detalle}</p>
              </div>
              <AssetPlaceholder
                label={item.placeholder.label}
                spec={item.placeholder.spec}
                className="rounded-2xl"
              />
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- CÓMO FUNCIONA ---------------- */}
      <section id="como-funciona" className="bg-[var(--anc-bg-soft)] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-mono text-xs font-black uppercase tracking-[.2em] text-[var(--anc-purple-deep)]">
            Cómo funciona
          </p>
          <h2 className="font-display mt-3 text-[clamp(2rem,4.6vw,3.4rem)] font-black leading-[.98] text-[var(--anc-ink)]">
            Tres pasos y estás vendiendo.
          </h2>
        </div>

        <ol className="mx-auto mt-16 grid max-w-6xl gap-8 md:grid-cols-3">
          {pasos.map((paso, index) => (
            <li
              key={paso.numero}
              className="reveal relative rounded-3xl border border-[var(--anc-border)] bg-white p-8 shadow-[0_20px_40px_-30px_rgba(30,27,75,.3)]"
              data-reveal-delay={index * 100}
            >
              <span className="font-display block text-5xl font-black text-[var(--anc-ink)]/10">{paso.numero}</span>
              <p className="mt-4 text-xl font-black text-[var(--anc-ink)]">{paso.titulo}</p>
              <p className="mt-3 text-base leading-6 text-[var(--anc-ink-muted)]">{paso.detalle}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------- REPARTO / PRECIO ---------------- */}
      <section id="reparto" className="px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-mono text-xs font-black uppercase tracking-[.2em] text-[var(--anc-purple-deep)]">
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

      {/* ---------------- FECHAS PUBLICADAS ---------------- */}
      {proximasFechas.length > 0 ? (
        <section className="bg-[var(--anc-bg-soft)] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
          <div className="mx-auto max-w-6xl">
            <h2 className="font-display text-[clamp(2rem,4.6vw,3.4rem)] font-black leading-[.98] text-[var(--anc-ink)]">
              Fechas publicadas con ANC.
            </h2>
            <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {proximasFechas.map((event, index) => (
                <li key={event.id} className="reveal" data-reveal-delay={index * 80}>
                  <Link
                    href={`/${event.slug}`}
                    className="block rounded-2xl border border-[var(--anc-border)] bg-white p-6 shadow-[0_16px_36px_-28px_rgba(30,27,75,.35)] transition-transform duration-150 hover:border-[var(--anc-ink)]/25 active:scale-[.98]"
                  >
                    <p className="font-mono text-xs font-bold uppercase tracking-[.14em] text-[var(--anc-purple-deep)]">
                      {new Date(event.event_date).toLocaleDateString("es-CL", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </p>
                    <p className="mt-2 text-xl font-black leading-tight text-[var(--anc-ink)]">{event.title}</p>
                    {event.venue ? <p className="mt-2 text-sm text-[var(--anc-ink-muted)]">{event.venue}</p> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ---------------- FAQ ---------------- */}
      <section id="preguntas" className="px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-xs font-black uppercase tracking-[.2em] text-[var(--anc-lime-deep)]">
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
      <section className="px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="reveal mx-auto max-w-5xl rounded-[32px] bg-[var(--anc-ink)] px-8 py-16 text-center sm:px-16 sm:py-20">
          <h2 className="font-display text-[clamp(2.4rem,6vw,4.4rem)] font-black leading-[.96] text-white">
            Tu próxima fecha,
            <br />
            publicada hoy.
          </h2>
          <div className="mt-10 flex justify-center">
            <HeroSignup compact />
          </div>
        </div>
      </section>

      <footer className="px-5 pb-14 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 border-t border-[var(--anc-border)] pt-8 text-sm text-[var(--anc-ink-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>ANC Tickets · Chile</p>
          <nav className="flex gap-5">
            <Link href="/privacidad" className="underline decoration-[var(--anc-purple)] decoration-2 underline-offset-4 hover:text-[var(--anc-ink)]">
              Privacidad
            </Link>
            <Link href="/terminos" className="underline decoration-[var(--anc-purple)] decoration-2 underline-offset-4 hover:text-[var(--anc-ink)]">
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
