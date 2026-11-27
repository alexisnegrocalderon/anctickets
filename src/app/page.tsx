/**
 * Raíz (`/`): las dos puertas ("Próximos eventos" / "Soy productor"). Quien
 * llega con contexto no las ve: la redirección se decide aquí, en el servidor,
 * para que no haya parpadeo (regla completa en src/lib/entry-routing.ts).
 * La portada de productores vive ahora en /productores, sin cambios.
 */
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DoorsScreen from "@/components/doors/doors-screen";
import { getOrganizerProfile, getVerifiedUser } from "@/lib/auth";
import { SIDE_COOKIE, decideEntry, parseSide } from "@/lib/entry-routing";

export const metadata: Metadata = {
  title: "ANC Tickets — Próximos eventos o crea el tuyo",
  description:
    "Descubre los próximos eventos y compra tus entradas, o publica tu evento y vende entradas desde tu celular.",
};

function first(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, cookieStore, user] = await Promise.all([searchParams, cookies(), getVerifiedUser()]);
  const profile = user ? await getOrganizerProfile(user.id) : null;

  const destination = decideEntry({
    para: first(params.para),
    ref: first(params.ref),
    loggedIn: !!user,
    isProducer: !!profile?.organizer_name,
    side: parseSide(cookieStore.get(SIDE_COOKIE)?.value),
  });
  if (destination) redirect(destination);

  return <DoorsScreen />;
}
