import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?next=/dashboard");

  return (
    <main className="min-h-screen bg-[#090909] px-4 py-4 sm:px-7 sm:py-7">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#f5f4f1] shadow-2xl">
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-3 bg-[#101010] px-5 py-4 text-sm font-medium text-white sm:px-7">
          <Link href="/" className="mr-2 text-base font-black italic tracking-[-.08em] leading-[.8] text-[#f5f4f1]">ANC<br />TICKETS</Link>
          <Link href="/dashboard" className="rounded-full px-3 py-2 transition hover:bg-white/10 hover:text-[#c3adff]">Mi panel</Link>
          <Link href="/dashboard/tickets" className="rounded-full px-3 py-2 transition hover:bg-white/10 hover:text-[#c3adff]">Mis entradas</Link>
          <span className="ml-auto max-w-full truncate text-xs text-neutral-400">{session.user.email}</span>
        </nav>
        <section className="min-h-[calc(100vh-7rem)] px-5 py-7 sm:px-9 sm:py-10">
          {children}
        </section>
      </div>
    </main>
  );
}
