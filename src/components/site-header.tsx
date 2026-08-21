import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import SignOutButton from "./sign-out-button";

export default async function SiteHeader() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <header className="border-b border-white/10 bg-[#090909] text-[#f5f4f1]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/" className="text-lg font-black italic leading-[.8] tracking-[-.08em] text-[#f5f4f1]">
          ANC<br />TICKETS
        </Link>

        <nav className="flex items-center gap-4 text-sm font-medium text-neutral-300 sm:gap-6">
          <Link href="/#eventos" className="transition hover:text-[#c3adff]">
            Eventos
          </Link>
          {session ? (
            <>
              <Link href="/dashboard/events" className="transition hover:text-[#c3adff]">
                Mis eventos
              </Link>
              <Link href="/dashboard/tickets" className="hidden transition hover:text-[#c3adff] sm:block">
                Mis entradas
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-[#a77fff] px-4 py-2 text-xs font-black tracking-[.1em] text-black transition hover:bg-[#c6b0ff]"
            >
              INGRESAR
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
