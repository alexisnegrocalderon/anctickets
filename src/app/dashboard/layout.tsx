import { redirect } from "next/navigation";
import { getOrganizerProfile, getVerifiedUser } from "@/lib/auth";
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

  return (
    <div className="min-h-dvh bg-[var(--anc-bg)] text-white md:flex">
      <div className="anc-progress" aria-hidden="true" />
      <DashboardNav />
      <main className="min-w-0 flex-1 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] md:px-8 md:pb-12 md:pt-10 lg:px-12">
        <div className="mx-auto w-full max-w-6xl">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[.2em] text-[var(--anc-vermilion)]">
            Productora
          </p>
          <p className="mb-6 mt-1 truncate font-display text-lg uppercase text-[var(--anc-muted-text)]">
            {profile.organizer_name}
          </p>
          {children}
        </div>
      </main>
    </div>
  );
}
