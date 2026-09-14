import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="anc-header-material sticky top-0 z-50">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4">
        <Link
          href="/"
          data-cursor-hover
          className="flex items-center gap-2 text-lg font-black tracking-tight text-[#f5f4f1] transition duration-100 active:scale-95"
        >
          <Image src="/anc-mark.png" alt="" width={28} height={28} priority />
          ANC<span className="text-[var(--anc-accent)]">TICKETS</span>
        </Link>

        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs font-semibold uppercase tracking-[.1em] text-neutral-300">
          <Link
            href="/"
            data-cursor-hover
            className="transition duration-100 hover:text-[var(--anc-accent-light)] active:text-[var(--anc-accent)]"
          >
            Eventos
          </Link>
          {user ? (
            <>
              <Link
                href="/dashboard/events"
                data-cursor-hover
                className="transition duration-100 hover:text-[var(--anc-accent-light)] active:text-[var(--anc-accent)]"
              >
                Mis eventos
              </Link>
              <Link
                href="/dashboard/tickets"
                data-cursor-hover
                className="transition duration-100 hover:text-[var(--anc-accent-light)] active:text-[var(--anc-accent)]"
              >
                Mis entradas
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              data-cursor-hover
              className="rounded-full bg-[#f5f4f1] px-4 py-1.5 text-black transition duration-100 hover:bg-[var(--anc-yellow)] active:scale-95"
            >
              Iniciar sesión
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
