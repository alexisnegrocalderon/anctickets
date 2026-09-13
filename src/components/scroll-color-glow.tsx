"use client";

/**
 * ANC: resplandor ambiental fijo que cambia de tono (magenta → turquesa → amarillo → magenta)
 * a medida que se hace scroll, para que la página se sienta viva y colorida de principio a fin
 * sin pelear con los bloques de color sólido de cada sección.
 */
import { motion, useMotionTemplate, useReducedMotion, useScroll, useTransform } from "motion/react";

export default function ScrollColorGlow() {
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();

  const color = useTransform(
    scrollYProgress,
    [0, 0.33, 0.66, 1],
    ["rgba(255,32,110,.32)", "rgba(65,234,212,.26)", "rgba(251,255,18,.24)", "rgba(255,32,110,.32)"],
  );
  const background = useMotionTemplate`radial-gradient(65vmax 65vmax at 50% 15%, ${color}, transparent 70%)`;

  if (prefersReducedMotion) return null;

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-30 mix-blend-screen"
      style={{ background }}
    />
  );
}
