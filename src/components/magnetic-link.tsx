"use client";

/** ANC: pull magnético hacia el cursor sobre los CTA principales, con springs interrumpibles (Motion). */
import Link from "next/link";
import { useEffect, useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";

type MagneticLinkProps = {
  href: string;
  className?: string;
  children: React.ReactNode;
};

const MotionLink = motion.create(Link);

/** damping 1.0 (crítico, sin rebote) — apropiado para un pull que sigue al cursor, no una arrojada. */
const SPRING = { stiffness: 260, damping: 26, mass: 0.5 };

export default function MagneticLink({ href, className, children }: MagneticLinkProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, SPRING);
  const y = useSpring(rawY, SPRING);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    function onMove(event: PointerEvent) {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      rawX.set((event.clientX - (rect.left + rect.width / 2)) * 0.28);
      rawY.set((event.clientY - (rect.top + rect.height / 2)) * 0.28);
    }

    function onLeave() {
      rawX.set(0);
      rawY.set(0);
    }

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [prefersReducedMotion, rawX, rawY]);

  return (
    <MotionLink
      href={href}
      ref={ref}
      className={className}
      data-cursor-hover
      style={prefersReducedMotion ? undefined : { x, y }}
    >
      {children}
    </MotionLink>
  );
}
