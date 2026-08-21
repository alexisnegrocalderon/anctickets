import { count, eq } from "drizzle-orm";
import OrganizerNav from "@/components/organizer-nav";
import { db } from "@/lib/db";
import { events, orders, tickets } from "@/lib/db/schema";
import { getOrganizerAccess } from "@/lib/organizer";
import { notFound } from "next/navigation";
import { requestOrganizationActivation } from "../actions";

export default async function OrganizerOverview({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const access = await getOrganizerAccess(slug);
  if (!access) notFound();
  const [{ totalEvents }] = await db.select({ totalEvents: count() }).from(events).where(eq(events.organizationId, access.organization.id));
  const [{ totalTickets }] = await db.select({ totalTickets: count() }).from(tickets).innerJoin(orders, eq(tickets.orderId, orders.id)).innerJoin(events, eq(orders.eventId, events.id)).where(eq(events.organizationId, access.organization.id));
  const isDraft = access.organization.status === "draft";
  return <div><OrganizerNav slug={slug} /><section className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-sm font-semibold text-neutral-500">{access.organization.status}</p><h1 className="mt-1 text-3xl font-bold">{access.organization.name}</h1><p className="mt-2 text-sm text-neutral-600">Administra eventos, promociones, embajadores y staff desde un solo espacio.</p></div>{isDraft && <form action={requestOrganizationActivation}><input type="hidden" name="slug" value={slug} /><button className="rounded-lg bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Solicitar activación</button></form>}</section><section className="mt-8 grid gap-4 sm:grid-cols-3"><div className="rounded-xl border border-neutral-200 p-4"><p className="text-xs text-neutral-500">Eventos</p><p className="mt-1 text-2xl font-bold">{totalEvents}</p></div><div className="rounded-xl border border-neutral-200 p-4"><p className="text-xs text-neutral-500">Entradas emitidas</p><p className="mt-1 text-2xl font-bold">{totalTickets}</p></div><div className="rounded-xl border border-neutral-200 p-4"><p className="text-xs text-neutral-500">Rol</p><p className="mt-1 text-2xl font-bold capitalize">{access.role}</p></div></section></div>;
}
