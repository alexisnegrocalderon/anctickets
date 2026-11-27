import type { Metadata } from "next";
import { TeamVerifyForm } from "../team-forms";
import { safeNextPath } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Verificación en 2 pasos",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function TeamVerifyPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-sm flex-col justify-center gap-6 px-4 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-black tracking-tight text-[#f5f4f1]">Verificación en 2 pasos</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Abre tu app de códigos (Contraseñas del iPhone o Google Authenticator) e ingresa el código de 6 dígitos.
        </p>
      </div>
      <TeamVerifyForm next={safeNextPath(next, "/admin")} />
    </div>
  );
}
