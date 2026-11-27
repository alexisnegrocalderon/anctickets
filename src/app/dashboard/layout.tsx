import { redirect } from "next/navigation";
import { getOrganizerProfile, getVerifiedUser } from "@/lib/auth";
import { getOwnSuspendedAt, SUSPENDED_ACCOUNT_MESSAGE } from "@/lib/suspension";
import DashboardNav from "@/components/dashboard/dashboard-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Verificación fuerte del usuario (servidor de Auth); la página reutiliza
  // este mismo resultado dentro de la petición.
  const user = await getVerifiedUser();

  if (!user) {
    redirect("/login?next=/dashboard/events");
  }

  const profile = await getOrganizerProfile(user.id);

  if (!profile?.organizer_name) {
    redirect("/onboarding");
  }

  const suspendedAt = await getOwnSuspendedAt(user.id);

  return (
    <div className="min-h-dvh bg-[var(--anc-bg)] text-white md:flex">
      <div className="anc-progress" aria-hidden="true" />
      <DashboardNav />
      <main className="min-w-0 flex-1 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] md:px-8 md:pb-12 md:pt-10 lg:px-12">
        <div className="mx-auto w-full max-w-6xl">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[.2em] text-[var(--anc-vermilion)]">
            Productora
          </p>
          <div className="mb-6">
            <p className="mt-1 truncate font-display text-lg uppercase text-[var(--anc-muted-text)]">
              {profile.organizer_name}
            </p>
            {suspendedAt ? (
              <p
                role="alert"
                className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200"
              >
                {SUSPENDED_ACCOUNT_MESSAGE}
              </p>
            ) : null}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
