import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizationActivationRequests, organizations, users } from "@/lib/db/schema";
import { requireAncAdmin } from "@/lib/organizer";
import { reviewOrganizationActivation } from "../../organizer/actions";

export default async function AdminOrganizationsPage() {
  await requireAncAdmin();
  const requests = await db
    .select({ request: organizationActivationRequests, organization: organizations, requester: users })
    .from(organizationActivationRequests)
    .innerJoin(organizations, eq(organizationActivationRequests.organizationId, organizations.id))
    .innerJoin(users, eq(organizationActivationRequests.requestedBy, users.id))
    .where(eq(organizationActivationRequests.status, "pending"))
    .orderBy(desc(organizationActivationRequests.createdAt));

  return (
    <div>
      <p className="text-sm font-semibold text-neutral-500">Administración ANC</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Solicitudes de activación</h1>
      <p className="mt-2 max-w-2xl text-sm text-neutral-600">Revisa cada organización antes de habilitar publicación y conexión de pagos. La activación queda registrada en auditoría.</p>
      <section className="mt-8 space-y-4">
        {requests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 p-5 text-sm text-neutral-500">No hay solicitudes pendientes.</div>
        ) : requests.map(({ request, organization, requester }) => (
          <article key={request.id} className="rounded-xl border border-neutral-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-neutral-950">{organization.name}</h2>
                <p className="mt-1 text-sm text-neutral-500">Solicitado por {requester.email} · {new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(request.createdAt)}</p>
                <p className="mt-2 text-sm text-neutral-600">Contacto: {organization.contactName ?? "Por definir"} · {organization.supportEmail ?? requester.email} · {organization.contactPhone ?? "Sin teléfono"}</p>
              </div>
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">{organization.status}</span>
            </div>
            <form action={reviewOrganizationActivation} className="mt-5 grid gap-3">
              <input type="hidden" name="organizationId" value={organization.id} />
              <textarea name="note" rows={2} placeholder="Nota interna o motivo de rechazo" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
              <div className="flex flex-wrap gap-2">
                <button name="decision" value="approve" className="rounded-lg bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Aprobar y activar</button>
                <button name="decision" value="reject" className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700">Rechazar</button>
              </div>
            </form>
          </article>
        ))}
      </section>
    </div>
  );
}
