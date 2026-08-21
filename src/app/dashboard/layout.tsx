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
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <nav className="mb-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-neutral-200 pb-4 text-sm font-medium text-neutral-600">
        <Link href="/dashboard" className="hover:text-neutral-950">Mi panel</Link>
        <Link href="/dashboard/tickets" className="hover:text-neutral-950">Mis entradas</Link>
        <span className="ml-auto text-xs text-neutral-400">{session.user.email}</span>
      </nav>
      {children}
    </main>
  );
}
