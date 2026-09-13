"use client";

/** ANC: cada afiche se pega al entrar en pantalla. Un solo momento, no efectos sueltos. */
import { useEffect } from "react";

export default function PasteReveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    document.documentElement.classList.add("motion-on");

    const posters = Array.from(document.querySelectorAll<HTMLElement>(".paste-in"));
    const timers: number[] = [];

    function paste(el: HTMLElement) {
      if (el.classList.contains("is-pasted")) return;
      const delay = Number(el.dataset.pasteDelay ?? 0);
      timers.push(window.setTimeout(() => el.classList.add("is-pasted"), delay));
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          paste(entry.target as HTMLElement);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );

    posters.forEach((poster) => observer.observe(poster));

    // Red de seguridad: si el observador no llega a disparar (scroll sintético,
    // navegador que restaura una posición, contenedor transformado), el afiche
    // se pega igual. Un texto invisible nunca es aceptable.
    const safety = window.setTimeout(() => {
      posters.forEach((poster) => {
        const rect = poster.getBoundingClientRect();
        if (rect.top < window.innerHeight * 1.15) paste(poster);
      });
    }, 1600);

    return () => {
      observer.disconnect();
      window.clearTimeout(safety);
      timers.forEach((timer) => window.clearTimeout(timer));
      document.documentElement.classList.remove("motion-on");
    };
  }, []);

  return null;
}
