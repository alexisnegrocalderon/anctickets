"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(cb: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
}

/** true si la persona pidió menos movimiento. En el servidor asume que no. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}

/**
 * true mientras el elemento está (en parte) dentro de la pantalla. Si vive en una
 * tarjeta del carrusel de funciones (móvil), además exige que sea la tarjeta activa.
 */
export function useInView<T extends Element>(ref: RefObject<T | null>, margin = "0px"): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const card = el.closest<HTMLElement>("[data-fs-step]");
    const root = el.closest<HTMLElement>(".fs");
    let visible = false;
    const apply = () => {
      const gated = !!card && !!root && root.classList.contains("fs-car-on");
      setInView(visible && (!gated || card!.classList.contains("is-active")));
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      apply();
    }, { rootMargin: margin });
    observer.observe(el);
    card?.addEventListener("fs-active-change", apply);
    return () => {
      observer.disconnect();
      card?.removeEventListener("fs-active-change", apply);
    };
  }, [ref, margin]);
  return inView;
}

/** Interpola un número hacia `target` (sin animar si hay reduced motion). */
export function useCountTo(target: number, reduced: boolean, ms = 900): number {
  const [value, setValue] = useState(target);
  const current = useRef(target);

  useEffect(() => {
    if (reduced) {
      current.current = target;
      const id = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(id);
    }
    const from = current.current;
    let raf = 0;
    let start = 0;
    const step = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(from + (target - from) * eased);
      current.current = next;
      setValue(next);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, reduced, ms]);

  return value;
}

export function clp(n: number): string {
  return `$${n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}
