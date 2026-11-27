import type { Metadata } from "next";
import { TeamLoginForm } from "./team-forms";
import { safeNextPath } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Acceso del equipo",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function TeamAccessPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-sm flex-col justify-center gap-6 px-4 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-black tracking-tight text-[#f5f4f1]">Acceso del equipo</h1>
        <p className="mt-2 text-sm text-neutral-400">Correo, clave y el código de 6 dígitos de tu app, todo en un solo paso.</p>
      </div>
      <TeamLoginForm next={safeNextPath(next, "/admin")} />
    </div>
  );
}
