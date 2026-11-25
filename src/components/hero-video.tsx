"use client";

/**
 * Fondo del hero: el poster (.webp) viene en el HTML y se pinta primero; el
 * video se monta recién después de la carga y no bloquea nada. Queda solo el
 * poster con reduced motion, Save-Data / conexión lenta o si el autoplay falla
 * (iOS en ahorro de energía). 9:16 bajo 768px y 16:9 desde 768px.
 */
import { useEffect, useRef, useState } from "react";

type Conn = { saveData?: boolean; effectiveType?: string };

function shouldSkipVideo(): boolean {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
  const c = (navigator as Navigator & { connection?: Conn }).connection;
  return !!c && (c.saveData === true || c.effectiveType === "slow-2g" || c.effectiveType === "2g");
}

export default function HeroVideo() {
  const [wide, setWide] = useState<boolean | null>(null);
  const [mount, setMount] = useState(false);
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const sync = () => setWide(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    if (shouldSkipVideo()) return () => mql.removeEventListener("change", sync);

    let cancelled = false;
    const start = () => {
      if (!cancelled) setMount(true);
    };
    // Después de pintar y de cargar la página; sin competir con el LCP.
    const later = () => {
      if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(start, { timeout: 2500 });
      else globalThis.setTimeout(start, 800);
    };
    if (document.readyState === "complete") later();
    else window.addEventListener("load", later, { once: true });
    return () => {
      cancelled = true;
      mql.removeEventListener("change", sync);
      window.removeEventListener("load", later);
    };
  }, []);

  // Pausa el video cuando el hero sale de pantalla (batería y CPU).
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) v.play().catch(() => {});
      else v.pause();
    });
    io.observe(v);
    return () => io.disconnect();
  }, [mount, wide]);

  const name = wide ? "anc-16x9" : "anc-9x16";

  return (
    <div className="hero-media" aria-hidden="true">
      <picture>
        <source media="(min-width: 768px)" srcSet="/video/anc-16x9.webp" />
        <img src="/video/anc-9x16.webp" alt="" className="hero-poster" decoding="async" />
      </picture>
      {mount && wide !== null ? (
        <video
          key={name}
          ref={ref}
          className="hero-video"
          data-playing={playing ? "" : undefined}
          src={`/video/${name}.mp4`}
          muted
          autoPlay
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          tabIndex={-1}
          onPlaying={() => setPlaying(true)}
          onError={() => setMount(false)}
          onLoadedData={(e) => {
            // Si el navegador bloquea el autoplay, se queda el poster.
            const v = e.currentTarget;
            v.play().catch(() => setMount(false));
          }}
        />
      ) : null}
    </div>
  );
}
