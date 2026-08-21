import { desc, eq } from "drizzle-orm";
import EventCreatorWizard from "@/components/event-creator-wizard";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { requireOrganizationManager } from "@/lib/organizer";

export default async function NewImmersiveEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { organization } = await requireOrganizationManager(slug);
  const [lastEvent] = await db.select({ title: events.title, category: events.category, venue: events.venue, description: events.description, imageUrl: events.imageUrl }).from(events).where(eq(events.organizationId, organization.id)).orderBy(desc(events.createdAt)).limit(1);
  return <EventCreatorWizard slug={slug} lastEvent={lastEvent ?? null} />;
}
