import Image from "next/image";
import Link from "next/link";
import type { Event, TicketType } from "@/lib/database.types";
import BuyForm from "@/app/(app)/events/[id]/buy-form";
import FloatingAccessButton from "@/components/floating-access-button";
import ScrollReveal from "@/components/scroll-reveal";
import { resolveEventTheme } from "@/lib/event-themes";

export default function EventPublicView({
  event,
  ticketTypes,
  isLoggedIn,
  organizerName,
  serverNow,
  salesSuspended = false,
}: {
  event: Event;
  ticketTypes: TicketType[] | null;
  isLoggedIn: boolean;
  organizerName: string | null;
  serverNow: number;
  /** La productora está suspendida: se muestra el aviso y se deshabilita la compra. */
  salesSuspended?: boolean;
}) {
  const date = new Date(event.event_date);
  const weekday = date.toLocaleDateString("es-CL", { weekday: "long" });
  const day = date.toLocaleDateString("es-CL", { day: "2-digit" });
  const month = date.toLocaleDateString("es-CL", { month: "short" }).replace(".", "").toUpperCase();
  const time = date.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
  const hasTickets = !!ticketTypes && ticketTypes.length > 0;
  const theme = resolveEventTheme(event.theme, event.accent_color);

  return (
    <main className="min-h-screen overflow-x-clip bg-[var(--anc-bg)] pb-28 text-white">
      <ScrollReveal />

      {/* ---------- Hero fusionado: imagen de fondo + título, datos y compra encima ---------- */}
      <section className="relative isolate flex min-h-[72svh] items-end overflow-hidden lg:min-h-[calc(100svh-4.5rem)]">
        {event.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.image_url}
            alt=""
            fetchPriority="high"
            className="absolute inset-0 -z-20 h-full w-full object-cover lg:scale-110 lg:opacity-50 lg:blur-2xl"
          />
        ) : (
          <div
            className="absolute inset-0 -z-20"
            style={{
              backgroundColor: "var(--anc-bg)",
              backgroundImage: `radial-gradient(circle at 80% 12%, ${theme.from}99, transparent 46%), radial-gradient(circle at 12% 80%, ${theme.from}40, transparent 44%)`,
            }}
          />
        )}
        {/* Degradado hacia el fondo de la página: el hero se funde con el contenido. */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(29,29,29,.35) 0%, rgba(29,29,29,.15) 28%, rgba(29,29,29,.78) 70%, #1d1d1d 100%)",
          }}
        />

        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 pb-10 pt-24 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-14 lg:pb-16">
          <div className="min-w-0">
            {organizerName ? (
              <p className="mb-3 flex items-center gap-2.5 font-mono text-[11px] font-bold uppercase tracking-[.18em] text-white/70">
                {event.organizer_logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={event.organizer_logo_url} alt="" className="h-7 max-w-[7rem] object-contain" />
                ) : null}
                <span className="truncate">Una producción de {organizerName}</span>
              </p>
            ) : null}

            <h1 className="text-[clamp(3rem,13vw,8.5rem)] uppercase leading-[.92] text-white [overflow-wrap:anywhere]">
              {event.title}
            </h1>

            <dl className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
              <div>
                <dt className="sr-only">Fecha</dt>
                <dd className="text-lg font-bold capitalize text-white sm:text-xl">
                  {weekday} {day} <span style={{ color: theme.from === "#3a3a3a" ? "#fff" : theme.from }}>{month}</span>
                  <span className="text-white/60"> · {time}</span>
                </dd>
              </div>
              {event.venue ? (
                <div className="flex items-center gap-2">
                  <dt className="sr-only">Lugar</dt>
                  <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-white/60" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                    <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" strokeLinejoin="round" />
                    <circle cx="12" cy="9.5" r="2.5" />
                  </svg>
                  <dd className="text-lg text-white/85 sm:text-xl">{event.venue}</dd>
                </div>
              ) : null}
            </dl>

            <div id="hero-cta" className="mt-7">
              {salesSuspended ? (
                <p role="status" className="inline-flex min-h-12 items-center rounded-full border border-white/25 bg-white/[.07] px-6 text-sm font-semibold text-white">
                  Ventas no disponibles por ahora
                </p>
              ) : hasTickets ? (
                <a
                  href="#entradas"
                  className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[var(--anc-vermilion)] px-9 text-base font-black uppercase tracking-[.04em] text-[var(--anc-ink)] shadow-[0_18px_50px_-14px_rgba(252,76,19,.7)] transition duration-300 [transition-timing-function:var(--ease-out)] hover:brightness-95 active:scale-[.98] sm:w-auto"
                >
                  Comprar entradas <span aria-hidden="true">→</span>
                </a>
              ) : (
                <p className="inline-flex min-h-12 items-center rounded-full border border-white/20 px-6 text-sm font-semibold text-white/80">
                  Entradas disponibles pronto
                </p>
              )}
            </div>
          </div>

          {/* Flyer: chico y nítido al lado en escritorio; en celular ya es el fondo. */}
          {event.image_url ? (
            <div className="hidden w-72 shrink-0 lg:block xl:w-80">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={event.image_url}
                alt={`Flyer de ${event.title}`}
                className="aspect-[4/5] w-full rounded-2xl border border-white/15 object-cover shadow-[0_30px_70px_-20px_rgba(0,0,0,.8)]"
              />
            </div>
          ) : null}
        </div>
      </section>

      {/* ---------- Detalle y compra ---------- */}
      <div
        className={`mx-auto grid w-full gap-10 px-4 pt-6 sm:px-8 lg:pt-12 ${
          event.description ? "max-w-6xl lg:grid-cols-[1fr_26rem] lg:gap-16" : "max-w-xl"
        }`}
      >
        <div className="min-w-0">
          {event.description ? (
            <div className="reveal">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[.18em]" style={{ color: theme.from === "#3a3a3a" ? "#a8a8a8" : theme.from }}>
                Sobre el evento
              </p>
              <p className="mt-3 max-w-[62ch] whitespace-pre-line text-base leading-7 text-neutral-300">
                {event.description}
              </p>
            </div>
          ) : null}
        </div>

        <section id="entradas" className="reveal min-w-0 scroll-mt-24">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[.18em] text-[var(--anc-muted-text)]">Tu acceso</p>
          <h2 className="mt-1 text-4xl uppercase leading-none text-white">Entradas</h2>

          <div className="mt-5">
            {!hasTickets ? (
              <p className="text-neutral-400">Este evento todavía no tiene entradas disponibles.</p>
            ) : (
              <BuyForm
                eventId={event.id}
                eventSlug={event.slug}
                ticketTypes={ticketTypes!}
                isLoggedIn={isLoggedIn}
                serverNow={serverNow}
                salesSuspended={salesSuspended}
              />
            )}
          </div>
        </section>
      </div>

      <div className="mx-auto mt-14 w-full max-w-6xl px-4 sm:px-8">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-1.5 border-t border-white/10 pt-4 font-mono text-[10px] uppercase tracking-[.16em] text-neutral-500 transition-colors hover:text-neutral-300"
        >
          <Image src="/anc-mark.png" alt="" width={12} height={12} className="opacity-60" />
          Powered by ANC Tickets — crea tu propio evento gratis
        </Link>
      </div>

      {hasTickets ? <FloatingAccessButton /> : null}
    </main>
  );
}
