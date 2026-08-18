import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
          {user ? (
            <>
              <Link href="/dashboard/events" className="hover:text-neutral-900">
                Mis eventos
              </Link>
              <Link href="/dashboard/tickets" className="hover:text-neutral-900">
                Mis entradas
              </Link>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="rounded-full border border-neutral-300 px-4 py-1.5 text-neutral-700 hover:bg-neutral-50"
                >
                  Cerrar sesión
                </button>
              </form>
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
