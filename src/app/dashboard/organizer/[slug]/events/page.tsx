import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import OrganizerNav from "@/components/organizer-nav";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { requireOrganizationManager } from "@/lib/organizer";

export default async function OrganizerEventsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { organization } = await requireOrganizationManager(slug);
  const organizerEvents = await db.select().from(events).where(eq(events.organizationId, organization.id)).orderBy(desc(events.eventDate));
  return <div><OrganizerNav slug={slug} /><div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-bold">Eventos</h1><p className="mt-1 text-sm text-neutral-600">Todos los eventos comienzan en borrador. ANC habilita la primera publicación tras activar tu organización.</p></div><Link href={`/dashboard/organizer/${slug}/events/new`} className="rounded-xl bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Crear la noche →</Link></div><section className="mt-6 space-y-3">{organizerEvents.length === 0 ? <div className="rounded-xl border border-dashed border-neutral-300 p-5 text-sm text-neutral-500">Aún no tienes eventos. Abre “Crear la noche” para construir el primero sin formularios extensos.</div> : organizerEvents.map((event) => <article key={event.id} className="rounded-xl border border-neutral-200 p-4"><div className="flex justify-between gap-4"><div><h2 className="font-semibold">{event.title}</h2><p className="mt-1 text-sm text-neutral-500">{new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(event.eventDate)} · {event.venue ?? "Lugar por definir"}</p></div><span className="text-xs font-semibold capitalize text-neutral-500">{event.status}</span></div></article>)}</section></div>;
}
