/**
 * Estilo ANC — Rave Editorial Noir: cine nocturno, tipografía monumental y verde
 * ácido como impulso de conversión para productores. El movimiento acompaña, no distrae.
 */
import Link from "next/link";
import AmbientSoundControl from "@/components/ambient-sound-control";
import HeroSignup from "@/components/hero-signup";
import HomeMotionEffects from "@/components/home-motion-effects";
import MagneticLink from "@/components/magnetic-link";
import ProductInteractions from "@/components/product-interactions";
import ScrollColorGlow from "@/components/scroll-color-glow";
import { createClient } from "@/lib/supabase/server";
import type { Event } from "@/lib/database.types";

const heroVideo = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663820533004/GbHXpGORdFcoZgeV.mp4";
const heroPoster = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663820533004/tmjnuDhpwrWwdDyk.jpg";

/** Cada tarjeta de evento toma un color del sistema "Retro Future", en orden de aparición. */
const CARD_ACCENTS = [
  { base: "#FF206E", ink: "#f5f4f1" },
  { base: "#FBFF12", ink: "#160f00" },
  { base: "#41EAD4", ink: "#062622" },
  { base: "#222222", ink: "#f5f4f1" },
] as const;

export default async function Home() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .order("event_date", { ascending: true })
    .returns<Event[]>();

  return (
    <main className="min-h-screen bg-[#090909] text-[#f5f4f1]">
      <div className="anc-scroll-progress" aria-hidden="true"><span /></div>
      <HomeMotionEffects />
      <ScrollColorGlow />

      <section className="anc-hero-scene" style={{ backgroundImage: `url(${heroPoster})` }}>
        <video
          className="anc-hero-video absolute inset-0 -z-30 h-full w-full object-cover object-[65%_center] grayscale contrast-110 brightness-[.68]"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={heroPoster}
          aria-label="Multitud en una fiesta nocturna, video ambiental sin sonido"
        >
          <source src={heroVideo} type="video/mp4" />
        </video>
        <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_78%_30%,rgba(255,32,110,.4),transparent_20%),radial-gradient(circle_at_24%_76%,rgba(65,234,212,.22),transparent_26%),radial-gradient(circle_at_65%_55%,rgba(255,32,110,.12),transparent_28%)] mix-blend-screen" />
        <div className="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(9,9,9,.97)_0%,rgba(9,9,9,.8)_36%,rgba(9,9,9,.22)_71%,rgba(9,9,9,.56)_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-20 h-2/5 bg-gradient-to-t from-[#090909] via-[#090909]/55 to-transparent" />

        <HeroSignup />
        <div className="anc-scroll-cue"><i />SCROLL PARA DESCUBRIR</div>
        <AmbientSoundControl />
      </section>

      <div className="anc-ticker" aria-hidden="true">
        <div className="anc-ticker-track">
          <span>VENTA DIRECTA <b>✦</b> COSTO ANC $0 <b>✦</b> MERCADO PAGO CONECTADO <b>✦</b> CONTROL DE PUERTA <b>✦</b> VENTA DIRECTA <b>✦</b> COSTO ANC $0 <b>✦</b> MERCADO PAGO CONECTADO <b>✦</b> CONTROL DE PUERTA <b>✦</b></span>
        </div>
      </div>

      <section className="border-b border-white/10 bg-[#0d0d0d] px-5 py-6 sm:px-10">
        <div className="mx-auto grid max-w-7xl gap-5 text-xs font-bold tracking-[.14em] text-neutral-300 sm:grid-cols-3 sm:gap-8">
          <p><span className="mr-3 text-[#FF206E]">—</span>VENDE ENTRADAS DE PAGO</p>
          <p><span className="mr-3" style={{ color: "var(--anc-yellow)" }}>—</span>COBRO DIRECTO A TU CUENTA</p>
          <p><span className="mr-3" style={{ color: "var(--anc-turquoise)" }}>—</span>OPERACIÓN HECHA PARA EVENTOS</p>
        </div>
      </section>

      <section id="productores" className="bg-[#41EAD4] px-5 py-20 text-[#062622] sm:px-10 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
          <div data-anc-reveal>
            <p className="text-xs font-black tracking-[.25em] text-[#FF206E]">LA DIFERENCIA ANC</p>
            <h2 className="mt-5 text-[clamp(4.5rem,12vw,10rem)] font-black leading-[.72] tracking-[-.11em]">
              $0
              <span className="block text-[clamp(2.6rem,7vw,6.3rem)]">PLATAFORMA.</span>
            </h2>
          </div>
          <div data-anc-reveal="right" className="border-l border-[#062622]/25 pl-6 sm:pl-8">
            <p className="text-2xl font-black leading-[.95] tracking-[-.06em] sm:text-3xl">TU FECHA NO DEBERÍA ENTREGAR EL CONTROL DE SU CAJA.</p>
            <p className="mt-6 max-w-md text-base leading-7 text-[#062622]/70">ANC Tickets no cobra una comisión de plataforma por tus ventas. Conecta Mercado Pago, vende desde tu propia página y recibe el pago en la cuenta de tu organización.</p>
            <MagneticLink href="#registro" className="mt-8 inline-flex items-center text-sm font-black text-[#062622] transition hover:text-[#FF206E]">CONECTAR Y CREAR MI EVENTO <span className="ml-2 text-xl">↗</span></MagneticLink>
          </div>
        </div>
      </section>

      <ProductInteractions />

      <section id="eventos-publicados" className="border-t border-white/10 bg-[#0b0b0b] px-5 py-20 sm:px-10 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div data-anc-reveal className="max-w-2xl">
            <p className="text-xs font-black tracking-[.25em] text-[#FF206E]">EN VENTA AHORA</p>
            <h2 className="mt-4 text-5xl font-black leading-[.82] tracking-[-.09em] sm:text-7xl">PRÓXIMOS<br />EVENTOS.</h2>
          </div>

          {!events || events.length === 0 ? (
            <p className="mt-10 text-sm text-neutral-500">Todavía no hay eventos publicados.</p>
          ) : (
            <div data-anc-horizontal-wrap className="relative mt-14 -mx-5 overflow-hidden sm:-mx-10 lg:mx-0">
              <div
                data-anc-horizontal-track
                className="flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-2 sm:px-10 md:snap-none md:overflow-visible md:px-0 lg:px-0"
              >
                {events.map((event, index) => {
                  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];
                  return (
                    <Link
                      key={event.id}
                      href={`/${event.slug}`}
                      data-cursor-hover
                      className="group w-[82vw] shrink-0 snap-start overflow-hidden border border-white/10 transition duration-150 active:scale-[.98] sm:w-[45vw] md:w-[380px]"
                      style={{ borderColor: "rgba(255,255,255,.1)" }}
                    >
                      <div className="aspect-video w-full bg-neutral-800">
                        {event.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={event.image_url}
                            alt={event.title}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="p-5" style={{ backgroundColor: accent.base }}>
                        <p className="text-[10px] font-black tracking-[.18em]" style={{ color: accent.ink, opacity: 0.7 }}>
                          {new Date(event.event_date).toLocaleDateString("es-CL", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                        <h3 className="mt-2 font-black leading-tight tracking-tight" style={{ color: accent.ink }}>
                          {event.title}
                        </h3>
                        {event.venue ? (
                          <p className="mt-1 text-sm" style={{ color: accent.ink, opacity: 0.65 }}>{event.venue}</p>
                        ) : null}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="bg-[#FF206E] px-5 py-20 text-[#f5f4f1] sm:px-10 sm:py-24">
        <div data-anc-reveal className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.25fr_.75fr] lg:items-end">
          <div>
            <p className="text-xs font-black tracking-[.25em]">ANC TICKETS / CHILE</p>
            <h2 className="mt-5 text-[clamp(4rem,9vw,8rem)] font-black leading-[.76] tracking-[-.11em]">
              EMPIEZA A<br />
              VENDER <span style={{ color: "var(--anc-yellow)" }}>HOY.</span>
            </h2>
          </div>
          <div>
            <p className="max-w-sm text-lg font-semibold leading-7">Crea tu evento, conecta Mercado Pago y mantén el control de cada venta desde el primer ticket.</p>
            <MagneticLink href="#registro" className="mt-8 inline-flex rounded-xl bg-[#222222] px-5 py-4 text-sm font-black text-[#f5f4f1] transition duration-200 hover:bg-white hover:text-[#FF206E] active:scale-[.97]">CREAR EVENTO CON COSTO $0 →</MagneticLink>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-8 sm:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-[10px] font-bold tracking-[.12em] text-neutral-500 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <span>ANC TICKETS / CHILE</span>
            <span className="flex gap-4">
              <Link href="/privacidad" className="transition hover:text-[#FF6FA0]">PRIVACIDAD</Link>
              <Link href="/terminos" className="transition hover:text-[#FF6FA0]">TÉRMINOS</Link>
            </span>
          </div>
          <span className="max-w-lg text-left leading-5 sm:text-right">COSTO DE PLATAFORMA ANC: $0. LAS TARIFAS Y CONDICIONES DEL PROCESAMIENTO DE PAGO CORRESPONDEN A MERCADO PAGO.</span>
        </div>
      </footer>
    </main>
  );
}
