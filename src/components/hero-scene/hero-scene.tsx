"use client";

/**
 * ANC: decide si mostrar el cluster 3D de pulseras/tickets (desktop, con WebGL,
 * sin preferencia de movimiento reducido) o su fallback estático liviano.
 * El bundle de Three.js/R3F solo se descarga cuando realmente se va a usar.
 */
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import HeroSceneFallback from "./hero-scene-fallback";

const HeroSceneCanvas = dynamic(() => import("./hero-scene-canvas"), { ssr: false });

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function HeroScene() {
  const prefersReducedMotion = useReducedMotion();
  const [canRender3D, setCanRender3D] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    // Detección de capacidades del navegador (no existe en el servidor): no hay forma
    // de sincronizar esto sin un efecto que corra tras el montaje en el cliente.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanRender3D(isDesktop && supportsWebGL());
  }, [prefersReducedMotion]);

  return canRender3D ? <HeroSceneCanvas /> : <HeroSceneFallback />;
}
