"use client";

/** Estilo ANC: revelados y parallax conducidos por GSAP ScrollTrigger, con fallback estático. */
import { useEffect } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

export default function HomeMotionEffects() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    document.documentElement.classList.add("anc-motion-enabled");
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const hero = document.querySelector<HTMLElement>(".anc-hero-scene");
      const heroVideo = document.querySelector<HTMLVideoElement>(".anc-hero-video");
      const progress = document.querySelector<HTMLElement>(".anc-scroll-progress span");

      if (hero && heroVideo) {
        gsap.to(heroVideo, {
          yPercent: -14,
          ease: "none",
          scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true },
        });
      }

      if (progress) {
        gsap.set(progress, { scaleX: 0 });
        ScrollTrigger.create({
          trigger: document.body,
          start: "top top",
          end: "bottom bottom",
          onUpdate: (self) => gsap.set(progress, { scaleX: self.progress }),
        });
      }

      const reveals = gsap.utils.toArray<HTMLElement>("[data-anc-reveal]");
      ScrollTrigger.batch(reveals, {
        start: "top bottom-=8%",
        onEnter: (batch) => batch.forEach((el) => el.classList.add("is-revealed")),
        once: true,
      });

      const grows = gsap.utils.toArray<HTMLElement>("[data-anc-grow]");
      grows.forEach((el) => {
        // La franja editorial pineada (PinnedEditorial) ya anima su propia imagen.
        const isPinnedEditorial = el.classList.contains("anc-editorial-image");
        const img = isPinnedEditorial ? null : el.querySelector<HTMLElement>("img");
        ScrollTrigger.create({
          trigger: el,
          start: "top bottom-=8%",
          once: true,
          onEnter: () => el.classList.add("is-growing"),
        });
        if (img) {
          gsap.fromTo(
            img,
            { scale: 1.18 },
            {
              scale: 1,
              ease: "none",
              scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
            },
          );
        }
      });
    });

    return () => {
      ctx.revert();
      document.documentElement.classList.remove("anc-motion-enabled");
    };
  }, []);

  return null;
}
