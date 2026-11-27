"use client";

import Link from "next/link";
import Tico from "@/components/tico";

/** Algo falló al mostrar la página. No muestra el detalle técnico a las personas. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 bg-[var(--anc-bg)] px-6 text-center text-white">
      <Tico pose="idle" width={170} />
      <div>
        <h1 className="font-display text-5xl uppercase leading-none">Ups, algo falló</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--anc-muted-text)]">
          No fue tu culpa. Inténtalo de nuevo; si sigue pasando, avísale a ANC.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-11 items-center rounded-full bg-[var(--doors-yellow)] px-5 font-extrabold text-[#1d1d1d]"
        >
          Reintentar
        </button>
        <Link href="/" className="inline-flex min-h-11 items-center rounded-full border border-white/25 px-5 font-bold text-white">
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
