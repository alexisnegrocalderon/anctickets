"use client";

/**
 * ANC dashboard: sidebar de vidrio colapsable (rail de íconos <-> panel con
 * etiquetas), inspirada en paneles tipo Spotify. En mobile se convierte en un
 * drawer que se desliza sobre el contenido.
 */
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navLinks = [
  { label: "Mis eventos", href: "/dashboard/events", icon: TicketIcon },
  { label: "Nuevo evento", href: "/dashboard/events/new", icon: PlusIcon },
  { label: "Mis entradas", href: "/dashboard/tickets", icon: QrIcon },
] as const;

export default function DashboardSidebar({
  userEmail,
}: {
  userEmail: string | null;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const panelClass =
    "flex h-full flex-col border border-white/10 bg-[#101010]/70 backdrop-blur-2xl shadow-[0_0_60px_-15px_rgba(167,127,255,.35)]";

  return (
    <>
      {/* Barra superior mobile */}
      <div className="flex items-center justify-between border-b border-white/10 bg-[#090909] px-4 py-3 sm:hidden">
        <Link href="/" className="flex items-center gap-2 text-base font-black italic tracking-tight text-[#f5f4f1]">
          <Image src="/anc-mark.png" alt="" width={26} height={26} priority />
          ANC<span className="text-[#a77fff]">TICKETS</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú"
          className="flex h-9 w-9 flex-col items-center justify-center gap-1.5"
        >
          <span className="h-px w-5 bg-[#f5f4f1]" />
          <span className="h-px w-5 bg-[#f5f4f1]" />
        </button>
      </div>

      {/* Overlay mobile */}
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/60 sm:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      {/* Sidebar desktop + drawer mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 m-3 w-64 rounded-2xl transition-transform duration-300 sm:sticky sm:inset-auto sm:top-3 sm:z-0 sm:h-[calc(100dvh-24px)] sm:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-[calc(100%+24px)]"
        } ${collapsed ? "sm:w-20" : "sm:w-64"}`}
      >
        <div className={panelClass}>
          <div className="flex items-center justify-between gap-2 px-4 py-5">
            <Link
              href="/"
              className="flex min-w-0 items-center gap-2 text-base font-black italic tracking-tight text-[#f5f4f1]"
            >
              <Image src="/anc-mark.png" alt="" width={28} height={28} priority className="shrink-0" />
              {collapsed ? null : (
                <span className="truncate">
                  ANC<span className="text-[#a77fff]">TICKETS</span>
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Cerrar menú"
              className="text-neutral-400 hover:text-[#f5f4f1] sm:hidden"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="h-px bg-white/10" />

          <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
            {navLinks.map(({ label, href, icon: Icon }) => {
              const active = pathname === href || (href !== "/dashboard/events" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  title={collapsed ? label : undefined}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-[#a77fff]/15 text-[#c3adff]"
                      : "text-neutral-400 hover:bg-white/5 hover:text-[#f5f4f1]"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {collapsed ? null : <span className="truncate">{label}</span>}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto flex flex-col gap-3 px-3 pb-4">
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              className="hidden items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-400 transition hover:bg-white/5 hover:text-[#f5f4f1] sm:flex"
            >
              <ChevronIcon className={`h-5 w-5 shrink-0 transition-transform ${collapsed ? "rotate-180" : ""}`} />
              {collapsed ? null : <span>Colapsar</span>}
            </button>

            <div className="h-px bg-white/10" />

            <div className="flex items-center gap-3 rounded-xl px-2 py-1.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#a77fff] to-[#5d3fa8] text-xs font-black text-[#120d1b]">
                {(userEmail ?? "?").slice(0, 1).toUpperCase()}
              </div>
              {collapsed ? null : (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-[#f5f4f1]">{userEmail ?? "Cuenta"}</p>
                  <form action="/auth/signout" method="post">
                    <button type="submit" className="text-xs text-neutral-500 transition hover:text-[#c3adff]">
                      Cerrar sesión
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function TicketIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a1.5 1.5 0 0 0 0 3v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a1.5 1.5 0 0 0 0-3V8Z" strokeLinejoin="round" />
      <path d="M10 6v12" strokeDasharray="2 3" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" strokeLinecap="round" />
    </svg>
  );
}

function QrIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <path d="M14 14h3v3h-3zM20 14v6M14 20h6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className ?? "h-5 w-5"}>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}
