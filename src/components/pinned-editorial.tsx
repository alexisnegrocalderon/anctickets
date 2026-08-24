"use client";

/** ANC Rave Editorial Noir: una escena pineada une manifiesto, imagen expansiva y venta. */
import { useEffect, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

export default function PinnedEditorial({ children }: { children: React.ReactNode }) {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(max-width: 900px)").matches) return;

    const section = sectionRef.current;
    const stage = section?.querySelector<HTMLElement>("[data-anc-cinema]");
    const copy = section?.querySelector<HTMLElement>(".anc-editorial-copy");
    const frame = section?.querySelector<HTMLElement>("[data-anc-cinema-frame]");
    const image = frame?.querySelector<HTMLElement>("img");
    const backdrop = section?.querySelector<HTMLElement>(".anc-cinema-backdrop");
    const stamp = section?.querySelector<HTMLElement>(".anc-cinema-stamp");
    if (!section || !stage || !copy || !frame || !image || !backdrop) return;
    const stampElement = stamp ?? undefined;

    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      const scene = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: stage,
          start: "top top",
          end: "+=145%",
          scrub: 0.8,
          pin: true,
          anticipatePin: 1,
        },
      });

      scene
        .fromTo(frame, { clipPath: "inset(13% 11% 13% 11%)", scale: 0.82 }, { clipPath: "inset(0% 0% 0% 0%)", scale: 1, duration: 0.62 }, 0)
        .fromTo(image, { scale: 1.34 }, { scale: 1.05, duration: 0.9 }, 0)
        .fromTo(copy, { xPercent: 0, autoAlpha: 1 }, { xPercent: -40, autoAlpha: 0, duration: 0.52 }, 0.3)
        .fromTo(backdrop, { xPercent: 10, autoAlpha: 0.08 }, { xPercent: -17, autoAlpha: 0.24, duration: 1 }, 0)
        .fromTo(stampElement ?? [], { autoAlpha: 0, y: 36 }, { autoAlpha: 1, y: 0, duration: 0.35 }, 0.66);
    }, section);

    return () => ctx.revert();
  }, []);

  return <div ref={sectionRef}>{children}</div>;
}
