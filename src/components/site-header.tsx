import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-white/10 bg-[#090909]">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4">
        <Link
          href="/"
          data-cursor-hover
          className="flex items-center gap-2 text-lg font-black tracking-tight text-[#f5f4f1]"
        >
          <Image src="/anc-mark.png" alt="" width={28} height={28} priority />
          ANC<span className="text-[#a77fff]">TICKETS</span>
        </Link>

        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs font-semibold uppercase tracking-[.1em] text-neutral-300">
          <Link href="/" data-cursor-hover className="transition hover:text-[#c3adff]">
            Eventos
          </Link>
          {user ? (
            <>
              <Link href="/dashboard/events" data-cursor-hover className="transition hover:text-[#c3adff]">
                Mis eventos
              </Link>
              <Link href="/dashboard/tickets" data-cursor-hover className="transition hover:text-[#c3adff]">
                Mis entradas
              </Link>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  data-cursor-hover
                  className="rounded-full border border-white/25 px-4 py-1.5 text-neutral-200 transition hover:border-[#c3adff] hover:text-[#c3adff]"
                >
                  Cerrar sesión
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              data-cursor-hover
              className="rounded-full bg-[#f5f4f1] px-4 py-1.5 text-black transition hover:bg-[#c3adff]"
            >
              Iniciar sesión
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
