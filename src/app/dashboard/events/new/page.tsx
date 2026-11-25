import { redirect } from "next/navigation";
import { getClaimsUser, getOrganizerProfile } from "@/lib/auth";
import EventWizard from "@/components/dashboard/event-wizard";

export default async function NewEventPage() {
  const user = await getClaimsUser();
  if (!user) redirect("/login?next=/dashboard/events/new");

  const profile = await getOrganizerProfile(user.id);

  return <EventWizard mpConnected={!!profile?.mp_connected} />;
}
