import { createClient } from "@/lib/supabase/server";
import EventWizard from "@/components/dashboard/event-wizard";

export default async function NewEventPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("mp_connected")
    .eq("id", user!.id)
    .single<{ mp_connected: boolean }>();

  return <EventWizard mpConnected={!!profile?.mp_connected} />;
}
