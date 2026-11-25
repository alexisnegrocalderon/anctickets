"use client";

/**
 * Carrusel de funciones para celular y tablet (<1024px, sin reduced motion).
 * El desplazamiento y el encaje los hace CSS puro (scroll-snap sobre .fs-list);
 * aquí solo se (1) detecta la tarjeta activa con scroll + rAF, (2) se dibujan
 * los indicadores y botones, y (3) se reinician las animaciones de la pantalla
 * que pasa a ser la activa. Las demás quedan quietas en su primer estado.
 * En escritorio o con reduced motion no hace nada (manda la escena sticky o la
 * pila estática) y los controles están ocultos por CSS.
 */
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

const CAROUSEL = "(max-width: 1023.98px) and (prefers-reduced-motion: no-preference)";

export default function FeatureCarousel({ rootId, ids }: { rootId: string; ids: string[] }) {
  const [active, setActive] = useState(0);
  const goRef = useRef<(i: number) => void>(() => {});
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const total = ids.length;

  useEffect(() => {
    const root = document.getElementById(rootId);
    const track = root?.querySelector<HTMLElement>(".fs-list");
    if (!root || !track) return;
    const cards = Array.from(track.querySelectorAll<HTMLElement>("[data-fs-step]"));
    if (cards.length < 2) return;
    const mql = window.matchMedia(CAROUSEL);

    let cur = 0;
    let raf = 0;
    let live: IntersectionObserver | null = null;
    let teardown: (() => void) | null = null;

    const rewind = (card: HTMLElement | undefined) =>
      card?.getAnimations({ subtree: true }).forEach((a) => {
        if ("animationName" in a) a.currentTime = 0; // solo animaciones CSS, no transiciones
      });

    const nearest = () => {
      const mid = track.scrollLeft + track.clientWidth / 2;
      let best = 0;
      let dist = Infinity;
      cards.forEach((c, k) => {
        const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid);
        if (d < dist) {
          dist = d;
          best = k;
        }
      });
      return best;
    };

    const select = (i: number) => {
      const prev = cur;
      cur = i;
      cards.forEach((c, k) => c.classList.toggle("is-active", k === i));
      if (prev !== i) {
        rewind(cards[prev]);
        rewind(cards[i]);
        cards.forEach((c) => c.dispatchEvent(new Event("fs-active-change")));
      }
      setActive(i);
    };

    const frame = () => {
      raf = 0;
      const mid = track.scrollLeft + track.clientWidth / 2;
      // Inclinación suave del celular según su distancia al centro (-1 a 1).
      cards.forEach((c) => {
        const d = (c.offsetLeft + c.offsetWidth / 2 - mid) / (c.offsetWidth + 12);
        c.style.setProperty("--cs", Math.max(-1, Math.min(1, d)).toFixed(3));
      });
      const n = nearest();
      if (n !== cur) select(n);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const goTo = (i: number) => {
      const k = Math.max(0, Math.min(cards.length - 1, i));
      const c = cards[k];
      track.scrollTo({ left: c.offsetLeft - (track.clientWidth - c.offsetWidth) / 2, behavior: "smooth" });
    };
    goRef.current = goTo;

    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.target !== track) return;
      const next = e.key === "ArrowRight" ? cur + 1 : e.key === "ArrowLeft" ? cur - 1 : e.key === "Home" ? 0 : e.key === "End" ? cards.length - 1 : null;
      if (next === null) return;
      e.preventDefault();
      goTo(next);
    };

    const enable = () => {
      root.classList.add("fs-car-on");
      track.setAttribute("role", "group");
      track.setAttribute("aria-roledescription", "carrusel");
      track.setAttribute("aria-label", "Funciones de ANC Tickets, desliza para ver más");
      track.tabIndex = 0;
      cards.forEach((c) => {
        c.setAttribute("role", "group");
        c.setAttribute("aria-roledescription", "diapositiva");
      });
      track.addEventListener("scroll", onScroll, { passive: true });
      track.addEventListener("keydown", onKey);
      // Las pantallas solo corren mientras la sección está a la vista; al entrar
      // arrancan desde el principio.
      live = new IntersectionObserver(
        ([entry]) => {
          root.classList.toggle("fs-live", entry.isIntersecting);
          if (entry.isIntersecting) rewind(cards[cur]);
        },
        { threshold: 0.15 },
      );
      live.observe(root);
      select(nearest());
      cards.forEach((c) => c.dispatchEvent(new Event("fs-active-change")));
      frame();
      teardown = () => {
        track.removeEventListener("scroll", onScroll);
        track.removeEventListener("keydown", onKey);
        live?.disconnect();
        live = null;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        root.classList.remove("fs-car-on", "fs-live");
        ["role", "aria-roledescription", "aria-label", "tabindex"].forEach((a) => track.removeAttribute(a));
        cards.forEach((c) => {
          c.removeAttribute("role");
          c.removeAttribute("aria-roledescription");
          c.style.removeProperty("--cs");
          c.dispatchEvent(new Event("fs-active-change"));
        });
      };
    };

    const sync = () => {
      teardown?.();
      teardown = null;
      if (mql.matches) enable();
    };
    sync();
    mql.addEventListener("change", sync);
    return () => {
      mql.removeEventListener("change", sync);
      teardown?.();
    };
  }, [rootId]);

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const next = e.key === "ArrowRight" ? active + 1 : e.key === "ArrowLeft" ? active - 1 : e.key === "Home" ? 0 : e.key === "End" ? total - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const k = Math.max(0, Math.min(total - 1, next));
    goRef.current(k);
    tabs.current[k]?.focus();
  };

  return (
    <div className="fs-ctl">
      <button type="button" className="fs-nav" aria-label="Función anterior" disabled={active === 0} onClick={() => goRef.current(active - 1)}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m15 5-7 7 7 7" />
        </svg>
      </button>
      <div className="fs-dots" role="tablist" aria-label="Elegir función" onKeyDown={onTabKey}>
        {ids.map((id, i) => (
          <button
            key={id}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            type="button"
            role="tab"
            className="fs-dot"
            aria-selected={i === active}
            aria-controls={id}
            aria-label={`Función ${i + 1} de ${total}`}
            tabIndex={i === active ? 0 : -1}
            onClick={() => goRef.current(i)}
          >
            <span />
          </button>
        ))}
      </div>
      <button type="button" className="fs-nav" aria-label="Función siguiente" disabled={active === total - 1} onClick={() => goRef.current(active + 1)}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m9 5 7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
