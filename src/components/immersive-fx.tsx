"use client";

/**
 * ANC — detalles inmersivos de la portada, todo con un solo grupo de listeners
 * pasivos y rAF:
 *  - brillo radial que sigue el dedo/mouse en [data-glow] (--mx, --my)
 *  - inclinación (máx. 8°) del celular fijo [data-tilt-global]: mouse en
 *    escritorio, deviceorientation en Android y, en iPhone, tras tocar el botón
 *    "Activar movimiento"
 *  - inclinación local (máx. 5°) de las tarjetas [data-tilt]
 *  - variable --sp (progreso de scroll) como respaldo de las luces del fondo
 * Con prefers-reduced-motion no se activa nada.
 */
import { useEffect, useSyncExternalStore } from "react";

type Perm = "idle" | "needed" | "granted" | "denied";
let perm: Perm = "idle";
const subs = new Set<() => void>();
const setPerm = (p: Perm) => {
  perm = p;
  subs.forEach((f) => f());
};
const subscribe = (cb: () => void) => {
  subs.add(cb);
  return () => {
    subs.delete(cb);
  };
};

type OrientationCtor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

const clamp = (n: number) => Math.max(-1, Math.min(1, n));
let applyGlobal: ((gx: number, gy: number) => void) | null = null;

function onOrientation(e: DeviceOrientationEvent) {
  if (e.gamma == null || e.beta == null) return;
  // Reposo ~ celular inclinado 50° hacia ti.
  applyGlobal?.(clamp(e.gamma / 30), clamp((e.beta - 50) / 30));
}

async function enableMotion() {
  try {
    const Ctor = window.DeviceOrientationEvent as OrientationCtor | undefined;
    if (!Ctor?.requestPermission) return;
    const res = await Ctor.requestPermission();
    if (res === "granted") {
      window.addEventListener("deviceorientation", onOrientation, { passive: true });
      setPerm("granted");
    } else setPerm("denied");
  } catch {
    setPerm("denied");
  }
}

export function MotionPermissionButton() {
  const p = useSyncExternalStore(subscribe, () => perm, () => "idle" as Perm);
  if (p !== "needed") return null;
  return (
    <button type="button" onClick={enableMotion} className="gbtn gbtn--ghost gbtn--sm mx-auto mt-3" data-glow>
      Activar movimiento
    </button>
  );
}

export default function ImmersiveFx() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const phones = Array.from(document.querySelectorAll<HTMLElement>("[data-tilt-global]"));
    let raf = 0;
    let glowEl: HTMLElement | null = null;
    let gx = 0,
      gy = 0,
      pointer: { x: number; y: number } | null = null;
    let tiltEl: HTMLElement | null = null;
    let sp = -1;

    const flush = () => {
      raf = 0;
      if (glowEl && pointer) {
        const r = glowEl.getBoundingClientRect();
        glowEl.style.setProperty("--mx", `${pointer.x - r.left}px`);
        glowEl.style.setProperty("--my", `${pointer.y - r.top}px`);
        if (glowEl.hasAttribute("data-tilt")) {
          const px = clamp(((pointer.x - r.left) / r.width - 0.5) * 2);
          const py = clamp(((pointer.y - r.top) / r.height - 0.5) * 2);
          glowEl.style.setProperty("--ry", `${(px * 5).toFixed(2)}deg`);
          glowEl.style.setProperty("--rx", `${(-py * 5).toFixed(2)}deg`);
        }
      }
      for (const el of phones) {
        el.style.setProperty("--ry", `${(gx * 8).toFixed(2)}deg`);
        el.style.setProperty("--rx", `${(-gy * 8).toFixed(2)}deg`);
      }
      if (sp >= 0) {
        document.documentElement.style.setProperty("--sp", sp.toFixed(4));
        sp = -1;
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(flush);
    };

    const release = (el: HTMLElement | null) => {
      if (!el) return;
      el.removeAttribute("data-gl");
      if (el.hasAttribute("data-tilt")) {
        el.style.setProperty("--rx", "0deg");
        el.style.setProperty("--ry", "0deg");
      }
    };

    const onMove = (e: PointerEvent) => {
      const target = (e.target as Element | null)?.closest<HTMLElement>("[data-glow]") ?? null;
      if (target !== glowEl) {
        release(glowEl);
        glowEl = target;
        tiltEl = target;
      }
      if (glowEl) {
        glowEl.setAttribute("data-gl", "");
        pointer = { x: e.clientX, y: e.clientY };
      }
      if (fine && e.pointerType === "mouse") {
        gx = clamp((e.clientX / window.innerWidth - 0.5) * 2);
        gy = clamp((e.clientY / window.innerHeight - 0.5) * 2);
      }
      schedule();
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") {
        release(glowEl);
        glowEl = null;
      }
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerdown", onMove, { passive: true });
    document.addEventListener("pointerup", onUp, { passive: true });
    document.addEventListener("pointercancel", onUp, { passive: true });
    document.addEventListener("pointerleave", () => release(glowEl), { passive: true });

    applyGlobal = (x, y) => {
      gx = x;
      gy = y;
      schedule();
    };

    // Movimiento del teléfono.
    const Ctor = window.DeviceOrientationEvent as OrientationCtor | undefined;
    const touch = window.matchMedia("(pointer: coarse)").matches;
    if (Ctor && touch) {
      // Solo iPhone/iPad piden permiso; en otros navegadores el evento es directo.
      if (typeof Ctor.requestPermission === "function") {
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) setPerm("needed");
      }
      else window.addEventListener("deviceorientation", onOrientation, { passive: true });
    }

    // Respaldo del scroll-driven animation de las luces.
    const nativeScroll = typeof CSS !== "undefined" && CSS.supports("animation-timeline: scroll()");
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      sp = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      schedule();
    };
    if (!nativeScroll) window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerdown", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      window.removeEventListener("deviceorientation", onOrientation);
      window.removeEventListener("scroll", onScroll);
      applyGlobal = null;
      if (raf) cancelAnimationFrame(raf);
      release(tiltEl);
    };
  }, []);

  return null;
}
