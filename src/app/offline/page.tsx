import type { Metadata } from "next";
import Image from "next/image";
import RetryButton from "./retry-button";

export const metadata: Metadata = {
  title: "Sin conexión — ANC Tickets",
  robots: { index: false },
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-[var(--anc-bg)] px-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] text-center text-white">
      <Image src="/anc-mark.png" alt="" width={72} height={72} priority />
      <p className="font-mono text-[11px] font-bold uppercase tracking-[.2em] text-[var(--anc-vermilion)]">
        Sin conexión
      </p>
      <h1 className="font-display text-[clamp(2.2rem,9vw,3.5rem)] uppercase leading-[.98]">No hay internet</h1>
      <p className="max-w-sm text-sm text-[var(--anc-muted-text)]">
        Esta página aún no está guardada en tu celular. Si ya abriste el escáner de un evento con internet, puedes
        seguir escaneando: las entradas se enviarán cuando vuelva la conexión.
      </p>
      <RetryButton />
    </main>
  );
}
