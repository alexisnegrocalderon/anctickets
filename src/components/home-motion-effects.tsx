"use client";

/** Estilo ANC: activa revelados sobrios al entrar en viewport sin sacrificar el fallback estático. */
import { useEffect } from "react";

export default function HomeMotionEffects() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    document.documentElement.classList.add("anc-motion-enabled");
    const items = Array.from(document.querySelectorAll<HTMLElement>("[data-anc-reveal]"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -8%" },
    );

    items.forEach((item) => observer.observe(item));
    return () => {
      observer.disconnect();
      document.documentElement.classList.remove("anc-motion-enabled");
    };
  }, []);

  return null;
}
