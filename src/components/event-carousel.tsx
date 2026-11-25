"use client";

/**
 * ANC — carrusel horizontal de fechas publicadas (inspirado en el carrusel de
 * casos de loveandmoney.com). Scroll-snap nativo con swipe/drag, no
 * scroll-jack: es el patrón más robusto en móvil y con trackpad, y sigue
 * dando la sensación de "desfile horizontal de casos".
 */
import Link from "next/link";
import { useRef } from "react";
import type { Event } from "@/lib/database.types";

export default function EventCarousel({ events }: { events: Event[] }) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scrollBy(delta: number) {
    trackRef.current?.scrollBy({ left: delta, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  return (
    <div className="relative">
      <div
        ref={trackRef}
        className="scrollbar-none flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4"
        style={{ scrollPaddingLeft: "1rem" }}
      >
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/${event.slug}`}
            className="block w-[260px] shrink-0 snap-start rounded-2xl border border-[var(--anc-border)] bg-[var(--anc-surface)] p-6 transition duration-300 [transition-timing-function:var(--ease-out)] hover:bg-[var(--anc-surface-2)] active:scale-[.98] sm:w-[300px]"
          >
            <p className="font-mono text-xs font-bold uppercase tracking-[.14em] text-[var(--anc-vermilion)]">
              {new Date(event.event_date).toLocaleDateString("es-CL", { day: "2-digit", month: "short" })}
            </p>
            <p className="mt-3 font-display text-3xl uppercase leading-[1] text-white">{event.title}</p>
            {event.venue ? <p className="mt-2 text-sm text-[var(--anc-muted-text)]">{event.venue}</p> : null}
          </Link>
        ))}
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => scrollBy(-320)}
          aria-label="Ver fechas anteriores"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:bg-white/10"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => scrollBy(320)}
          aria-label="Ver más fechas"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:bg-white/10"
        >
          →
        </button>
      </div>
    </div>
  );
}
