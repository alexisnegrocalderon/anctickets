"use client";

/** ANC: CTA flotante glassmorphism que lleva a la sección de entradas, con entrada y hover en spring. */
import { motion, useReducedMotion } from "motion/react";

export default function FloatingAccessButton() {
  const prefersReducedMotion = useReducedMotion();

  function scrollToTickets() {
    document.getElementById("entradas")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="fixed inset-x-0 bottom-5 z-40 flex justify-center px-4" aria-hidden="false">
      <motion.button
        type="button"
        onClick={scrollToTickets}
        data-cursor-hover
        initial={prefersReducedMotion ? false : { y: 40, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.3 }}
        whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
        className="group inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-black uppercase tracking-[.08em] text-white shadow-[0_8px_40px_-8px_rgba(252,76,19,.65)] backdrop-blur-xl transition hover:border-[var(--anc-accent-light)]/60 hover:bg-white/15"
      >
        Quiero mi acceso
        <motion.span
          className="inline-block"
          animate={{ x: 0 }}
          whileHover={prefersReducedMotion ? undefined : { x: 4 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        >
          →
        </motion.span>
      </motion.button>
    </div>
  );
}
