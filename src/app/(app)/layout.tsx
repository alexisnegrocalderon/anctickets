import { Suspense, type ReactNode } from "react";
import SiteHeader, { SiteHeaderFallback } from "@/components/site-header";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--anc-bg)] text-white">
      {/* El encabezado espera al usuario; el resto de la pantalla (y su esqueleto) no. */}
      <Suspense fallback={<SiteHeaderFallback />}>
        <SiteHeader />
      </Suspense>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
