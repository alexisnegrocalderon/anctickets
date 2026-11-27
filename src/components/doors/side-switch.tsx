"use client";

/**
 * Interruptor "🎟 Eventos / 🎤 Productor" de la portada de productores. Solo
 * aparece para quien ya eligió un lado alguna vez (cookie), para poder
 * cambiarse sin pasar de nuevo por las puertas.
 */
import Link from "next/link";
import { rememberSide } from "./remember-side";

export default function SideSwitch() {
  return (
    <nav className="side-switch" aria-label="Cambiar de lado">
      <Link href="/eventos" className="side-switch-opt" onClick={() => rememberSide("eventos")}>
        <span aria-hidden="true">🎟</span> Eventos
      </Link>
      <span className="side-switch-opt" data-on aria-current="page">
        <span aria-hidden="true">🎤</span> Productor
      </span>
    </nav>
  );
}
