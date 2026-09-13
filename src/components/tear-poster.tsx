"use client";

/**
 * ANC — interacción firma: arrancar el afiche.
 * El afiche de arriba se rasga a medida que avanzas por la sección y se queda
 * rasgado; debajo aparece intacto el de ANC. El borde del rasgado no es un
 * polígono: es una máscara desplazada por turbulencia, así que rompe como papel.
 */
import { useEffect, useRef, useState } from "react";

export default function TearPoster({
  top,
  bottom,
}: {
  top: React.ReactNode;
  bottom: React.ReactNode;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [torn, setTorn] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Sincroniza con una preferencia del navegador que no existe en el servidor:
      // sin efecto no hay forma de leerla sin romper la hidratación.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReduced(true);
      return;
    }

    const section = sectionRef.current;
    if (!section) return;

    let frame = 0;
    function onScroll() {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const el = sectionRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        // 0 cuando la sección entra por abajo, 1 cuando su centro cruza el centro.
        const progress = 1 - (rect.top + rect.height * 0.25) / window.innerHeight;
        setTorn(Math.min(1, Math.max(0, progress)));
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

  // La máscara descubre desde arriba: el papel se levanta y deja ver lo de abajo.
  const cut = reduced ? 100 : Math.round(torn * 118);

  return (
    <div ref={sectionRef} className="relative">
      <div className="relative">
        {bottom}
        <div
          aria-hidden={cut > 60}
          className="absolute inset-0"
          style={{
            WebkitMaskImage: `linear-gradient(to bottom, transparent ${cut}%, #000 ${cut + 4}%)`,
            maskImage: `linear-gradient(to bottom, transparent ${cut}%, #000 ${cut + 4}%)`,
          }}
        >
          {top}
        </div>
      </div>
    </div>
  );
}
