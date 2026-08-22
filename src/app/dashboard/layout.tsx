import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardSidebar from "@/components/dashboard/dashboard-sidebar";
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
    <div className="flex min-h-full flex-col bg-[#090909] text-[#f5f4f1] sm:flex-row">
      <DashboardSidebar userEmail={user.email ?? null} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-10">
        <div className="mb-8">
          <p className="font-mono text-xs font-bold uppercase tracking-[.2em] text-[#a77fff]">
            Productora
          </p>
          <h1 className="mt-1 text-4xl font-black tracking-tight text-[#f5f4f1] sm:text-5xl">
            {profile.organizer_name}
          </h1>
        </div>
        {children}
      </main>
    </div>
  );
}
