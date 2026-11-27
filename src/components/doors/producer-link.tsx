"use client";

import Link from "next/link";
import { rememberSide } from "./remember-side";

/** Enlace "Publica el tuyo" de la cartelera: cuenta como elegir el lado productor. */
export default function ProducerLink() {
  return (
    <Link
      href="/productores"
      onClick={() => rememberSide("productor")}
      className="inline-flex min-h-11 items-center font-bold text-white underline decoration-[var(--anc-vermilion)] decoration-2 underline-offset-4"
    >
      Publica el tuyo gratis
    </Link>
  );
}
