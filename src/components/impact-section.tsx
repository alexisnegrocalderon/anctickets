"use client";

/**
 * ANC — sección de impacto a pantalla completa (inspirada en el "THINK BIG"
 * de loveandmoney.com): una frase corta y enorme sobre un fondo de video o
 * color sólido, con un parallax leve en el fondo mientras se hace scroll.
 * El parallax es solo una transformación CSS (translateY), nunca layout, y
 * se desactiva por completo con prefers-reduced-motion.
 */
import { useEffect, useRef, useState } from "react";

export default function ImpactSection({
  children,
  video,
  poster,
  bg = "var(--anc-ink)",
  id,
}: {
  children: React.ReactNode;
  video?: string;
  poster?: string;
  bg?: string;
  id?: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Sincroniza con una preferencia del navegador que no existe en el
      // servidor: sin efecto no hay forma de leerla sin romper la hidratación.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReduced(true);
      return;
    }

    let frame = 0;
    function onScroll() {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const section = sectionRef.current;
        const bgEl = bgRef.current;
        if (!section || !bgEl) return;
        const rect = section.getBoundingClientRect();
        // Progreso -1 (la sección entra por abajo) a 1 (sale por arriba).
        const progress = 1 - (rect.top + rect.height / 2) / (window.innerHeight / 2);
        const clamped = Math.min(1.4, Math.max(-1.4, progress));
        bgEl.style.transform = `translateY(${clamped * 28}px) scale(1.12)`;
      });
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section id={id} ref={sectionRef} className="relative flex min-h-[80svh] items-center justify-center overflow-hidden" style={{ background: bg }}>
      <div ref={bgRef} className="pointer-events-none absolute inset-0" style={reduced ? undefined : { transform: "scale(1.12)" }} aria-hidden="true">
        {video ? (
          <>
            <video className="h-full w-full object-cover" autoPlay muted loop playsInline preload="metadata" poster={poster}>
              <source src={video} type="video/mp4" />
            </video>
            {/* El velo solo existe para que el texto se lea sobre video; un
                fondo de color sólido ya controla su propio contraste. */}
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(29,29,29,.35), rgba(29,29,29,.55))" }} />
          </>
        ) : null}
      </div>
      <div className="reveal relative px-6 py-24 text-center sm:px-10">{children}</div>
    </section>
  );
}
