"use client";

/** Estilo ANC: activa revelados sobrios al entrar en viewport sin sacrificar el fallback estático. */
import { useEffect } from "react";

export default function HomeMotionEffects() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    document.documentElement.classList.add("anc-motion-enabled");
    const hero = document.querySelector<HTMLElement>(".anc-hero-scene");
    const progress = document.querySelector<HTMLElement>(".anc-scroll-progress span");
    let frame = 0;

    function updateHeroDepth() {
      const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const scrollRatio = Math.min(window.scrollY / maxScroll, 1);
      if (hero) {
        const depth = Math.min(window.scrollY * 0.035, 24);
        hero.style.setProperty("--anc-scroll-y", `${depth}px`);
        hero.style.setProperty("--anc-scroll-glow", `${Math.min(window.scrollY * 0.0007, 0.17)}`);
      }
      if (progress) progress.style.transform = `scaleX(${scrollRatio})`;
      frame = 0;
    }

    function onScroll() {
      if (!frame) frame = window.requestAnimationFrame(updateHeroDepth);
    }

    const items = Array.from(document.querySelectorAll<HTMLElement>("[data-anc-reveal], [data-anc-grow]"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            entry.target.classList.add("is-growing");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -8%" },
    );

    items.forEach((item) => observer.observe(item));
    updateHeroDepth();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      document.documentElement.classList.remove("anc-motion-enabled");
    };
  }, []);

  return null;
}
