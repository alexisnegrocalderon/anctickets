"use client";

/**
 * Controlador de la escena sticky: un IntersectionObserver sobre los bloques de
 * texto decide cuál función está activa y pasa .is-active a su pantalla del
 * celular fijo. No guarda estado en React (no re-renderiza las pantallas).
 * Con reduced motion no hace nada: el CSS muestra las 4 pantallas apiladas.
 */
import { useEffect } from "react";

export default function FeatureStageFx({ rootId }: { rootId: string }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.getElementById(rootId);
    if (!root) return;
    const steps = Array.from(root.querySelectorAll<HTMLElement>("[data-fs-step]"));
    const screens = Array.from(root.querySelectorAll<HTMLElement>(".fs-phone .fs-screen"));
    if (!steps.length || screens.length !== steps.length) return;

    root.classList.add("fs-on");
    const activate = (i: number) => {
      screens.forEach((s, k) => s.classList.toggle("is-active", k === i));
      steps.forEach((s, k) => s.classList.toggle("is-active", k === i));
    };
    activate(0);

    // Franja de lectura: bajo el celular en móvil, al centro en escritorio.
    let io: IntersectionObserver | null = null;
    const build = () => {
      io?.disconnect();
      const desktop = window.matchMedia("(min-width: 1024px)").matches;
      const margin = desktop ? "-45% 0px -45% 0px" : "-58% 0px -38% 0px";
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) activate(steps.indexOf(entry.target as HTMLElement));
          }
        },
        { rootMargin: margin, threshold: 0 },
      );
      steps.forEach((s) => io!.observe(s));
    };
    build();
    const mql = window.matchMedia("(min-width: 1024px)");
    mql.addEventListener("change", build);

    // Las animaciones internas de cada pantalla arrancan al ver la escena.
    const live = new IntersectionObserver(
      ([entry]) => root.classList.toggle("fs-live", entry.isIntersecting),
      { threshold: 0.15 },
    );
    live.observe(root);

    return () => {
      io?.disconnect();
      live.disconnect();
      mql.removeEventListener("change", build);
      root.classList.remove("fs-on", "fs-live");
    };
  }, [rootId]);

  return null;
}
