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
          yPercent: -20,
          scale: 1.15,
          ease: "none",
          scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true },
        });

        const nav = hero.querySelector<HTMLElement>("[data-anc-hero-nav]");
        const eyebrow = hero.querySelector<HTMLElement>("[data-anc-hero-eyebrow]");
        const lines = gsap.utils.toArray<HTMLElement>("[data-anc-hero-line]");
        const details = gsap.utils.toArray<HTMLElement>("[data-anc-hero-detail]");
        const panel = hero.querySelector<HTMLElement>("[data-anc-hero-panel]");
        const sidecode = hero.querySelector<HTMLElement>(".anc-hero-sidecode");

        const intro = gsap.timeline({ defaults: { ease: "power4.out" } });
        intro
          .from(nav, { autoAlpha: 0, y: -18, duration: 0.62 })
          .from(eyebrow, { autoAlpha: 0, y: 16, duration: 0.5 }, "-=0.26")
          .from(lines, { yPercent: 118, duration: 0.9, stagger: 0.1 }, "-=0.28")
          .from(details, { autoAlpha: 0, y: 18, duration: 0.56, stagger: 0.1 }, "-=0.42")
          .from(panel, { autoAlpha: 0, x: 64, duration: 0.76 }, "-=0.7")
          .from(sidecode, { autoAlpha: 0, x: 20, duration: 0.48 }, "-=0.48");

        gsap.to("[data-anc-hero-copy]", {
          yPercent: -15,
          ease: "none",
          scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true },
        });
        gsap.to(panel, {
          yPercent: 18,
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
