import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardNav from "@/components/dashboard/dashboard-nav";

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

  return (
    <div className="flex min-h-full flex-col bg-[#090909] text-[#f5f4f1]">
      <header className="relative border-b border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-black italic tracking-tight text-[#f5f4f1]"
          >
            <Image src="/anc-mark.png" alt="" width={30} height={30} priority />
            ANC<span className="text-[#a77fff]">TICKETS</span>
          </Link>

          <DashboardNav />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-10">
        {children}
      </main>
    </div>
  );
}
