import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizationMemberships, organizations } from "@/lib/db/schema";
import { requireCurrentUser } from "@/lib/organizer";
import { createOrganization } from "./organizer/actions";

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  const memberships = await db.select({ organization: organizations, role: organizationMemberships.role }).from(organizationMemberships).innerJoin(organizations, eq(organizations.id, organizationMemberships.organizationId)).where(eq(organizationMemberships.userId, user.id));
  return <div className="space-y-9"><section><p className="text-sm font-semibold text-neutral-500">Organizadores</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Tu espacio de trabajo</h1><p className="mt-2 max-w-xl text-sm text-neutral-600">Crea una organización para administrar eventos, promociones y equipo de puerta. El espacio queda en borrador hasta que ANC habilite su primera venta.</p></section><section className="grid gap-4 md:grid-cols-2">{memberships.map(({ organization, role }) => <Link key={organization.id} href={`/dashboard/organizer/${organization.slug}`} className="rounded-2xl border border-neutral-200 bg-white p-5 transition hover:border-neutral-900"><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold text-neutral-950">{organization.name}</h2><p className="mt-1 text-sm text-neutral-500">{role} · {organization.status}</p></div><span className="text-xs text-neutral-400">Abrir →</span></div></Link>)}</section><section className="max-w-md rounded-2xl border border-neutral-200 bg-neutral-50 p-5"><h2 className="font-semibold">Crear espacio de organizador</h2><form action={createOrganization} className="mt-4 grid gap-3"><input name="name" required placeholder="Nombre de la organización" className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm" /><input name="contactPhone" placeholder="Teléfono de contacto" className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm" /><button className="rounded-lg bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Crear organización</button></form></section></div>;
}
