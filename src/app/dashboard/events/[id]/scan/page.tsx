import { notFound, redirect } from "next/navigation";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eventStaff, events, organizationMemberships } from "@/lib/db/schema";
import ScannerClient from "./scanner-client";

export default async function ScanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const [event] = await db
    .select({ title: events.title })
    .from(events)
    .leftJoin(organizationMemberships, and(eq(organizationMemberships.organizationId, events.organizationId), eq(organizationMemberships.userId, session.user.id)))
    .leftJoin(eventStaff, and(eq(eventStaff.eventId, events.id), eq(eventStaff.userId, session.user.id)))
    .where(and(
      eq(events.id, id),
      or(
        inArray(organizationMemberships.role, ["owner", "manager"]),
        and(eq(eventStaff.canScan, true), isNull(eventStaff.revokedAt))
      )
    ));

  if (!event) notFound();

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-1 text-2xl font-bold text-neutral-900">
        Validar entradas
      </h1>
      <p className="mb-6 text-sm text-neutral-500">{event.title}</p>
      <ScannerClient eventId={id} />
    </div>
  );
}
