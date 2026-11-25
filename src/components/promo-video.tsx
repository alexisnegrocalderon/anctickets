"use client";

/**
 * "Mírala en acción": video de Hyperframes (9:16 en celular, 16:9 en escritorio).
 * Arriba del pliegue no se descarga nada: el video solo se monta al acercarse y
 * con reduced motion queda el poster con un botón de play. Si el archivo no
 * existe o falla, se muestra el celular animado en vivo.
 */
import { useEffect, useRef, useState } from "react";
import Phone from "@/components/phone/phone";
import LiveSalesScreen from "@/components/phone/live-sales";
import { useInView, useReducedMotion } from "@/components/phone/hooks";

export default function PromoVideo() {
  const reduced = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const near = useInView(box, "300px");
  const [wide, setWide] = useState(false);
  const [failed, setFailed] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const sync = () => setWide(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  const name = wide ? "anc-16x9" : "anc-9x16";
  const showVideo = !failed && near && (!reduced || started);

  return (
    <div
      ref={box}
      className="relative mx-auto aspect-[9/16] w-full max-w-[22rem] overflow-hidden rounded-[28px] border border-[var(--anc-border)] bg-[var(--anc-surface)] md:aspect-video md:max-w-4xl"
    >
      {failed ? (
        <div className="flex h-full items-center justify-center px-4 py-6">
          <div className="w-44 sm:w-52">
            <Phone mode="hero" label="Panel de ventas del evento de ejemplo Noche Neón">
              <LiveSalesScreen />
            </Phone>
          </div>
        </div>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/video/${name}.webp`}
            alt="Vista previa del video de ANC Tickets"
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
          />
          {showVideo ? (
            <video
              key={name}
              className="absolute inset-0 h-full w-full object-cover"
              src={`/video/${name}.mp4`}
              poster={`/video/${name}.webp`}
              muted
              autoPlay
              loop
              playsInline
              preload="metadata"
              controls={reduced}
              aria-label="Video promocional de ANC Tickets"
              onError={() => setFailed(true)}
            />
          ) : null}
          {reduced && !started ? (
            <button
              type="button"
              onClick={() => setStarted(true)}
              className="absolute inset-0 flex items-center justify-center bg-black/30"
              aria-label="Reproducir el video"
            >
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--anc-vermilion)] text-3xl text-[var(--anc-ink)]">
                ▶
              </span>
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
