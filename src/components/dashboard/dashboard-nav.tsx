"use client";

/** ANC dashboard: nav responsivo — fila en desktop, colapsa a menú en mobile. */
import Link from "next/link";
import { useState } from "react";

const navLinks = [
  ["Mis eventos", "/dashboard/events"],
  ["Nuevo evento", "/dashboard/events/new"],
  ["Mis entradas", "/dashboard/tickets"],
] as const;

export default function DashboardNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="hidden items-center gap-5 text-sm font-medium text-neutral-400 sm:flex">
        {navLinks.map(([label, href]) => (
          <Link key={href} href={href} className="transition hover:text-[#c3adff]">
            {label}
          </Link>
        ))}
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="rounded-full border border-white/20 px-4 py-1.5 text-[#f5f4f1] transition hover:border-[#c3adff] hover:text-[#c3adff]"
          >
            Cerrar sesión
          </button>
        </form>
      </nav>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 sm:hidden"
      >
        <span
          className={`h-px w-5 bg-[#f5f4f1] transition ${open ? "translate-y-[3.5px] rotate-45" : ""}`}
        />
        <span
          className={`h-px w-5 bg-[#f5f4f1] transition ${open ? "-translate-y-[3.5px] -rotate-45" : ""}`}
        />
      </button>

      {open ? (
        <div className="absolute inset-x-0 top-full border-b border-white/10 bg-[#0d0d0d] px-4 py-4 sm:hidden">
          <div className="flex flex-col gap-3 text-sm font-medium text-neutral-300">
            {navLinks.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-2 transition hover:bg-white/5 hover:text-[#c3adff]"
              >
                {label}
              </Link>
            ))}
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="w-full rounded-lg border border-white/20 px-3 py-2 text-left text-[#f5f4f1] transition hover:border-[#c3adff] hover:text-[#c3adff]"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
