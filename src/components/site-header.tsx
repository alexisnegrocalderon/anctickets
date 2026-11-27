import Image from "next/image";
import Link from "next/link";
import { getVerifiedUser } from "@/lib/auth";

const linkClass =
  "inline-flex min-h-11 items-center transition-colors duration-200 hover:text-white active:text-[var(--anc-vermilion)]";

export default async function SiteHeader() {
  const user = await getVerifiedUser();

  return (
    <header className="anc-header-material sticky top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-2 font-display text-xl uppercase text-white transition duration-100 active:scale-95"
          aria-label="ANC Tickets, inicio"
        >
          <Image src="/anc-mark.png" alt="" width={28} height={28} priority />
          <span className="hidden min-[400px]:inline">
            ANC <span className="text-[var(--anc-vermilion)]">Tickets</span>
          </span>
        </Link>

        <nav className="flex items-center gap-x-4 font-mono text-xs font-semibold uppercase tracking-[.08em] text-neutral-300 sm:gap-x-6">
          <Link href="/eventos" className={`${linkClass} hidden sm:inline-flex`}>
            Eventos
          </Link>
          {user ? (
            <>
              <Link href="/dashboard/events" className={linkClass}>
                Mis eventos
              </Link>
              <Link href="/mis-entradas" className={linkClass}>
                Mis entradas
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center rounded-full bg-white px-5 text-[var(--anc-ink)] transition duration-100 hover:bg-neutral-200 active:scale-95"
            >
              Ya tengo cuenta
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

/** Mismo encabezado sin sesión: se ve al instante mientras llega el estado del usuario. */
export function SiteHeaderFallback() {
  return (
    <header className="anc-header-material sticky top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-2 font-display text-xl uppercase text-white"
          aria-label="ANC Tickets, inicio"
        >
          <Image src="/anc-mark.png" alt="" width={28} height={28} priority />
          <span className="hidden min-[400px]:inline">
            ANC <span className="text-[var(--anc-vermilion)]">Tickets</span>
          </span>
        </Link>
        <div className="min-h-11" aria-hidden="true" />
      </div>
    </header>
  );
}
