"use client";

/**
 * ANC panel: navegación adaptativa con los mismos 4 destinos.
 *  - Celular (<768px): barra inferior fija con 4 íconos.
 *  - Tablet (768px): barra lateral colapsada en riel de íconos, expandible.
 *  - Escritorio (>=1024px): barra lateral abierta, colapsable.
 */
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType } from "react";

type IconProps = { className?: string };

const NAV: { label: string; href: string; icon: ComponentType<IconProps>; match: (path: string) => boolean }[] = [
  {
    label: "Eventos",
    href: "/dashboard/events",
    icon: TicketIcon,
    match: (path) => path.startsWith("/dashboard/events") && !path.startsWith("/dashboard/events/new"),
  },
  {
    label: "Nuevo",
    href: "/dashboard/events/new",
    icon: PlusIcon,
    match: (path) => path.startsWith("/dashboard/events/new"),
  },
  {
    label: "Entradas",
    href: "/dashboard/entradas",
    icon: QrIcon,
    match: (path) => path.startsWith("/dashboard/entradas"),
  },
  {
    label: "Cuenta",
    href: "/dashboard/account",
    icon: UserIcon,
    match: (path) => path.startsWith("/dashboard/account"),
  },
];

export default function DashboardNav() {
  const pathname = usePathname();
  // auto: riel en tablet, abierta en escritorio. "open"/"closed": el usuario decidió.
  const [mode, setMode] = useState<"auto" | "open" | "closed">("auto");

  return (
    <>
      {/* Barra inferior (celular) */}
      <nav
        aria-label="Panel del productor"
        className="anc-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-[var(--anc-border)] bg-[var(--anc-bg)]/92 backdrop-blur-xl md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-4">
          {NAV.map(({ label, href, icon: Icon, match }) => {
            const active = match(pathname);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors duration-200 ${
                    active ? "text-[var(--anc-vermilion)]" : "text-[var(--anc-muted-text)] active:text-white"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Barra lateral (tablet y escritorio) */}
      <aside
        className="anc-side sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-[var(--anc-border)] bg-[var(--anc-bg)] md:flex"
        data-mode={mode === "auto" ? "auto" : mode}
      >
        <div className="flex h-20 items-center gap-2 px-5">
          <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="ANC Tickets, inicio">
            <Image src="/anc-mark.png" alt="" width={30} height={30} priority className="shrink-0" />
            <span className="anc-side-label truncate font-display text-xl uppercase text-white">
              ANC <span className="text-[var(--anc-vermilion)]">Tickets</span>
            </span>
          </Link>
        </div>

        <nav aria-label="Panel del productor" className="flex flex-1 flex-col gap-1 px-3 py-2">
          {NAV.map(({ label, href, icon: Icon, match }) => {
            const active = match(pathname);
            return (
              <Link
                key={href}
                href={href}
                title={label}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition-colors duration-200 ${
                  active
                    ? "bg-[var(--anc-vermilion)]/15 text-[var(--anc-vermilion)]"
                    : "text-[var(--anc-muted-text)] hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="anc-side-label truncate">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[var(--anc-border)] p-3">
          <button
            type="button"
            onClick={() => setMode((value) => (value === "open" || (value === "auto" && isWide()) ? "closed" : "open"))}
            aria-label="Colapsar o expandir la barra lateral"
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 text-sm font-semibold text-[var(--anc-muted-text)] transition-colors hover:bg-white/5 hover:text-white"
          >
            <ChevronIcon className="h-5 w-5 shrink-0" />
            <span className="anc-side-label">Colapsar</span>
          </button>
        </div>
      </aside>
    </>
  );
}

function isWide() {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
}

function TicketIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
      <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a1.5 1.5 0 0 0 0 3v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a1.5 1.5 0 0 0 0-3V8Z" strokeLinejoin="round" />
      <path d="M10 6v12" strokeDasharray="2 3" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" strokeLinecap="round" />
    </svg>
  );
}

function QrIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <path d="M14 14h3v3h-3zM20 14v6M14 20h6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UserIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 19.5c1-3.3 3.6-5 7-5s6 1.7 7 5" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
