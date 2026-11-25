"use client";

/**
 * ANC — escenas del celular al hacer scroll. Cada [data-scene] recibe .is-in al
 * entrar en pantalla (y la pierde al salir, para que se repita). Sin JS o con
 * prefers-reduced-motion no se agrega .scenes-on: todo queda en su estado final.
 */
import { useEffect } from "react";

export default function ScrollScenes() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const scenes = Array.from(document.querySelectorAll<HTMLElement>("[data-scene]"));
    if (!scenes.length) return;

    document.documentElement.classList.add("scenes-on");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.3) el.classList.add("is-in");
          else if (!entry.isIntersecting) el.classList.remove("is-in");
        }
      },
      { threshold: [0, 0.3] },
    );
    scenes.forEach((s) => observer.observe(s));

    return () => {
      observer.disconnect();
      document.documentElement.classList.remove("scenes-on");
    };
  }, []);

  return null;
}
