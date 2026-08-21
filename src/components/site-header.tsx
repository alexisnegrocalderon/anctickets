import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import SignOutButton from "./sign-out-button";

export default async function SiteHeader() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-extrabold tracking-tight text-neutral-900">
          ANC<span className="text-orange-500">Tickets</span>
        </Link>

        <nav className="flex items-center gap-5 text-sm font-medium text-neutral-600">
          <Link href="/" className="hover:text-neutral-900">
            Eventos
          </Link>
          {session ? (
            <>
              <Link href="/dashboard/events" className="hover:text-neutral-900">
                Mis eventos
              </Link>
              <Link href="/dashboard/tickets" className="hover:text-neutral-900">
                Mis entradas
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-neutral-900 px-4 py-1.5 text-white hover:bg-neutral-700"
            >
              Iniciar sesión
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
