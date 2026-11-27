"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Resumen", match: (p: string) => p === "/admin" },
  { href: "/admin/productoras", label: "Productoras", match: (p: string) => p.startsWith("/admin/productoras") || p.startsWith("/admin/eventos") },
  { href: "/admin/salud", label: "Salud", match: (p: string) => p.startsWith("/admin/salud") },
];

/** Pestañas deslizables (arriba, también en celular: no hay barra inferior en /admin). */
export default function AdminTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Administración" className="-mx-4 mb-6 border-b border-[var(--anc-border)] md:mx-0">
      <ul className="flex snap-x gap-1 overflow-x-auto px-4 [scrollbar-width:none] md:px-0 [&::-webkit-scrollbar]:hidden">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.href} className="shrink-0 snap-start">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center border-b-2 px-4 text-sm font-semibold transition ${
                  active
                    ? "border-[var(--anc-vermilion)] text-white"
                    : "border-transparent text-[var(--anc-muted-text)] hover:text-white"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
