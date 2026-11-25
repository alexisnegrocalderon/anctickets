"use client";

/**
 * Controlador de la escena sticky: un IntersectionObserver sobre los bloques de
 * texto decide cuál función está activa y pasa .is-active a su pantalla del
 * celular fijo. No guarda estado en React (no re-renderiza las pantallas).
 * Solo actúa en escritorio (>=1024px); en celular y tablet manda el carrusel
 * (feature-carousel.tsx). Con reduced motion no hace nada: el CSS muestra las
 * 4 pantallas apiladas.
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

    const activate = (i: number) => {
      screens.forEach((s, k) => s.classList.toggle("is-active", k === i));
      steps.forEach((s, k) => s.classList.toggle("is-active", k === i));
    };

    const desk = window.matchMedia("(min-width: 1024px)");
    let io: IntersectionObserver | null = null;
    let live: IntersectionObserver | null = null;
    const build = () => {
      io?.disconnect();
      live?.disconnect();
      io = live = null;
      root.classList.remove("fs-on", "fs-live");
      if (!desk.matches) return; // celular y tablet: carrusel
      root.classList.add("fs-on");
      activate(0);
      // Franja de lectura al centro de la pantalla.
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) activate(steps.indexOf(entry.target as HTMLElement));
          }
        },
        { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
      );
      steps.forEach((s) => io!.observe(s));
      // Las animaciones internas de cada pantalla arrancan al ver la escena.
      live = new IntersectionObserver(
        ([entry]) => root.classList.toggle("fs-live", entry.isIntersecting),
        { threshold: 0.15 },
      );
      live.observe(root);
    };
    build();
    desk.addEventListener("change", build);

    return () => {
      io?.disconnect();
      live?.disconnect();
      desk.removeEventListener("change", build);
      root.classList.remove("fs-on", "fs-live");
    };
  }, [rootId]);

  return null;
}
