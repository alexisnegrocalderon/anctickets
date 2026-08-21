import { and, eq, isNull } from "drizzle-orm";
import OrganizerNav from "@/components/organizer-nav";
import { db } from "@/lib/db";
import { eventStaff, events, users } from "@/lib/db/schema";
import { requireOrganizationManager } from "@/lib/organizer";
import { inviteEventStaff } from "../../actions";

export default async function StaffPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { organization } = await requireOrganizationManager(slug);
  const organizerEvents = await db.select().from(events).where(eq(events.organizationId, organization.id));
  const staffRows = await db.select({ staff: eventStaff, eventTitle: events.title, name: users.name, email: users.email }).from(eventStaff).innerJoin(events, eq(events.id, eventStaff.eventId)).innerJoin(users, eq(users.id, eventStaff.userId)).where(and(eq(events.organizationId, organization.id), isNull(eventStaff.revokedAt)));
  return <div><OrganizerNav slug={slug} /><h1 className="text-2xl font-bold">Staff de puerta</h1><p className="mt-1 text-sm text-neutral-600">Invita una cuenta existente de ANC Tickets y limita su acceso al evento asignado.</p><section className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]"><div className="space-y-3">{staffRows.length === 0 ? <p className="rounded-xl border border-dashed border-neutral-300 p-5 text-sm text-neutral-500">Aún no tienes staff asignado.</p> : staffRows.map(({ staff, eventTitle, name, email }) => <article key={staff.id} className="rounded-xl border border-neutral-200 p-4"><p className="font-semibold">{name}</p><p className="mt-1 text-sm text-neutral-500">{email} · {eventTitle}</p></article>)}</div><form action={inviteEventStaff} className="h-fit rounded-xl border border-neutral-200 bg-neutral-50 p-5"><h2 className="font-semibold">Invitar staff</h2><input type="hidden" name="slug" value={slug} /><div className="mt-4 grid gap-3"><select required name="eventId" className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"><option value="">Selecciona un evento</option>{organizerEvents.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select><input required name="email" type="email" placeholder="Correo de la cuenta ANC" className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm" /><button className="rounded-lg bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Asignar acceso de puerta</button></div></form></section></div>;
}
