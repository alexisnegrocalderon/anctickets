"use client";

/** ANC: cada elemento .reveal aparece al entrar en pantalla. */
import { useEffect } from "react";

export default function ScrollReveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    document.documentElement.classList.add("motion-on");

    const items = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    const timers: number[] = [];

    function show(el: HTMLElement) {
      if (el.classList.contains("is-in")) return;
      const delay = Number(el.dataset.revealDelay ?? 0);
      timers.push(window.setTimeout(() => el.classList.add("is-in"), delay));
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          show(entry.target as HTMLElement);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );

    items.forEach((item) => observer.observe(item));

    // Red de seguridad: si el observador no llega a disparar (scroll sintético,
    // navegador que restaura una posición, contenedor transformado), el
    // elemento se muestra igual. Un texto invisible nunca es aceptable.
    const safety = window.setTimeout(() => {
      items.forEach((item) => {
        const rect = item.getBoundingClientRect();
        if (rect.top < window.innerHeight * 1.15) show(item);
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
