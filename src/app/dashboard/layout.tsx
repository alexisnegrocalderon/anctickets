import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardNav from "@/components/dashboard/dashboard-nav";
import type { Profile } from "@/lib/database.types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard/events");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organizer_name")
    .eq("id", user.id)
    .single<Pick<Profile, "organizer_name">>();

  if (!profile?.organizer_name) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-dvh bg-[var(--anc-bg)] text-white md:flex">
      <DashboardNav />
      <main className="min-w-0 flex-1 px-4 pb-28 pt-6 md:px-8 md:pb-12 md:pt-10 lg:px-12">
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
