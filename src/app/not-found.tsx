import type { Metadata } from "next";
import Link from "next/link";
import Tico from "@/components/tico";

export const metadata: Metadata = { title: "No encontramos esta página — ANC Tickets" };

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 bg-[var(--anc-bg)] px-6 text-center text-white">
      <Tico pose="lentes" width={190} priority />
      <div>
        <p className="font-mono text-xs font-bold uppercase tracking-[.2em] text-[var(--anc-vermilion)]">Error 404</p>
        <h1 className="mt-2 font-display text-5xl uppercase leading-none">Esta página no existe</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--anc-muted-text)]">
          Puede que el link esté mal escrito o que el evento ya no esté disponible. Tico te lleva a un lugar seguro.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/eventos" className="inline-flex min-h-11 items-center rounded-full bg-[var(--doors-yellow)] px-5 font-extrabold text-[#1d1d1d]">
          Ver próximos eventos
        </Link>
        <Link href="/" className="inline-flex min-h-11 items-center rounded-full border border-white/25 px-5 font-bold text-white">
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
