import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import SignOutButton from "./sign-out-button";

/**
 * Estilo ANC — Rave Editorial Noir: cabecera de alto contraste, sobria y suspendida
 * sobre el video; el acento lila se reserva para la acción de conversión.
 */
export default async function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <header className={`${overlay ? "absolute inset-x-0 top-0" : "relative"} z-50 border-b border-white/15 bg-[#090909]/82 text-[#f5f4f1] shadow-[0_12px_38px_rgba(0,0,0,.18)] backdrop-blur-xl`}>
      <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-10">
        <Link href="/" className="relative z-10 text-lg font-black italic leading-[.76] tracking-[-.09em] text-[#f5f4f1] transition hover:text-[#c3adff]" aria-label="ANC Tickets, inicio">
          ANC<br />TICKETS
        </Link>

        <nav className="flex items-center gap-3 text-xs font-bold tracking-[.04em] text-neutral-200 sm:gap-6 sm:text-sm sm:font-medium sm:tracking-normal" aria-label="Navegación principal">
          <Link href="/#como-funciona" className="hidden transition hover:text-[#c3adff] sm:block">
            Cómo funciona
          </Link>
          <Link href="/#productores" className="hidden transition hover:text-[#c3adff] md:block">
            Productores
          </Link>
          <Link href="/#eventos" className="hidden transition hover:text-[#c3adff] lg:block">
            Eventos
          </Link>
          {session ? (
            <>
              <Link href="/dashboard" className="transition hover:text-[#c3adff]">
                Mi panel
              </Link>
              <Link href="/dashboard/tickets" className="hidden transition hover:text-[#c3adff] lg:block">
                Mis entradas
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-[#a77fff] px-3 py-2.5 text-[10px] font-black tracking-[.08em] text-black transition duration-200 hover:bg-[#c6b0ff] active:scale-[.97] sm:px-4 sm:text-xs"
            >
              CREAR EVENTO
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
