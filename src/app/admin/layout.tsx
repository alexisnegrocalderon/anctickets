import type { Metadata } from "next";
import { getAdminAccess, requireAdmin } from "@/lib/admin";
import AdminTabs from "@/components/admin/admin-tabs";
import { LinkButton } from "@/components/dashboard/ui";

export const dynamic = "force-dynamic";

/**
 * El título y el robots solo se ponen si quien pide la página es admin: un 404 para otra persona
 * no debe delatar que /admin existe (el <title> del 404 saldría igual al de cualquier
 * ruta inexistente). Tampoco se agrega para una sesión con clave sola sin código.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { decision } = await getAdminAccess();
  // Quien no puede entrar (no admin, o clave sola) no recibe nada: la 404 sale igual para todos.
  return decision === "allow" ? { title: "Administración ANC", robots: { index: false, follow: false, nocache: true } } : {};
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Primera barrera: si no es admin, 404 antes de renderizar nada. Cada página y
  // cada acción vuelve a comprobarlo por su cuenta.
  await requireAdmin();

  return (
    <div className="min-h-dvh bg-[var(--anc-bg)] text-white">
      <div className="anc-progress" aria-hidden="true" />
      <main className="min-w-0 px-4 pb-12 pt-[calc(1.25rem+env(safe-area-inset-top))] md:px-8 md:pt-8 lg:px-12">
        <div className="mx-auto w-full max-w-6xl">
          <header className="mb-5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[.18em] text-white">
                Admin
              </span>
              <h1 className="mt-2 text-[clamp(1.9rem,8vw,2.75rem)] uppercase leading-[.98] text-white">
                Administración ANC
              </h1>
            </div>
            <LinkButton href="/dashboard/events" className="shrink-0">
              Mi panel
            </LinkButton>
          </header>
          <AdminTabs />
          {children}
        </div>
      </main>
    </div>
  );
}
