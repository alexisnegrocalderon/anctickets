"use client";

/** ANC Rave Editorial Noir: cursor de anillo que reacciona a elementos [data-cursor-hover]. */
import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function CustomCursor() {
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    document.documentElement.classList.add("anc-cursor-enabled");
    const ring = ringRef.current;
    const dot = dotRef.current;
    if (!ring || !dot) return;

    const moveRing = gsap.quickTo(ring, "x", { duration: 0.55, ease: "power3" });
    const moveRingY = gsap.quickTo(ring, "y", { duration: 0.55, ease: "power3" });
    const moveDot = gsap.quickTo(dot, "x", { duration: 0.12, ease: "power3" });
    const moveDotY = gsap.quickTo(dot, "y", { duration: 0.12, ease: "power3" });

    function onMove(event: PointerEvent) {
      moveRing(event.clientX);
      moveRingY(event.clientY);
      moveDot(event.clientX);
      moveDotY(event.clientY);
    }

    function onOver(event: PointerEvent) {
      const target = (event.target as HTMLElement)?.closest("[data-cursor-hover]");
      ring?.classList.toggle("is-active", Boolean(target));
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerover", onOver);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      document.documentElement.classList.remove("anc-cursor-enabled");
    };
  }, []);

  return (
    <div aria-hidden="true">
      <div ref={ringRef} className="anc-cursor-ring" />
      <div ref={dotRef} className="anc-cursor-dot" />
    </div>
  );
}
