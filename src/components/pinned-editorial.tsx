"use client";

/** ANC Rave Editorial Noir: fija el copy mientras la imagen escala/oscurece al pasar. */
import { useEffect, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

export default function PinnedEditorial({ children }: { children: React.ReactNode }) {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(max-width: 900px)").matches) return;

    const section = sectionRef.current;
    const copy = section?.querySelector<HTMLElement>(".anc-editorial-copy");
    const image = section?.querySelector<HTMLElement>(".anc-editorial-image img");
    if (!section || !copy || !image) return;

    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      const trigger = ScrollTrigger.create({
        trigger: section,
        start: "top top+=80",
        end: "+=60%",
        pin: copy,
        pinSpacing: false,
      });

      gsap.fromTo(
        image,
        { scale: 1.18 },
        {
          scale: 1,
          ease: "none",
          scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: true },
        },
      );

      return () => trigger.kill();
    }, section);

    return () => ctx.revert();
  }, []);

  return <div ref={sectionRef}>{children}</div>;
}
