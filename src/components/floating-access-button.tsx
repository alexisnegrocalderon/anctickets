"use client";

/**
 * ANC: CTA flotante que lleva a la sección de entradas. Solo aparece cuando el
 * botón del hero ya salió de pantalla y las entradas todavía no se ven, así
 * nunca compite con el CTA principal. Respeta prefers-reduced-motion.
 */
import { useEffect, useState } from "react";

export default function FloatingAccessButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("hero-cta");
    const tickets = document.getElementById("entradas");
    if (!hero || !tickets) return;

    let heroOn = true;
    let ticketsOn = false;
    const update = () => setVisible(!heroOn && !ticketsOn);

    const heroObserver = new IntersectionObserver(([entry]) => {
      // Visible también cuando el hero quedó por encima del viewport al bajar.
      heroOn = entry.isIntersecting;
      update();
    });
    const ticketsObserver = new IntersectionObserver(([entry]) => {
      ticketsOn = entry.isIntersecting;
      update();
    });
    heroObserver.observe(hero);
    ticketsObserver.observe(tickets);
    return () => {
      heroObserver.disconnect();
      ticketsObserver.disconnect();
    };
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] transition duration-500 [transition-timing-function:var(--ease-out)] motion-reduce:transition-none ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
      }`}
    >
      <a
        href="#entradas"
        tabIndex={visible ? 0 : -1}
        className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--anc-vermilion)] px-7 text-sm font-black uppercase tracking-[.06em] text-[var(--anc-ink)] shadow-[0_12px_40px_-8px_rgba(252,76,19,.7)] transition active:scale-[.97]"
      >
        Quiero mi acceso <span aria-hidden="true">→</span>
      </a>
    </div>
  );
}
