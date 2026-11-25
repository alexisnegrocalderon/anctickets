import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ScannerClient from "./scanner-client";

export const metadata: Metadata = {
  title: "Control de acceso — ANC Tickets",
  robots: { index: false },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Control de acceso del evento. Lo usan el productor y el staff de puerta
 * (por eso vive fuera de /dashboard, que exige onboarding de productor).
 */
export default async function ScanPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  if (!UUID_RE.test(eventId)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/scan/${eventId}`)}`);

  const admin = createAdminClient();
  const { data: allowed } = await admin.rpc("can_scan_event", { p_event_id: eventId, p_user_id: user.id });

  if (!allowed) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#090909] px-6 text-center text-[#f5f4f1]">
        <h1 className="text-2xl font-black">No tienes acceso a este evento</h1>
        <p className="max-w-sm text-sm text-neutral-400">
          Estás conectado como {user.email}. Pídele al productor que agregue ese correo como staff de puerta.
        </p>
        <Link href="/" className="text-sm text-[var(--anc-accent-light)] underline">
          Volver al inicio
        </Link>
      </main>
    );
  }

  const { data: event } = await admin
    .from("events")
    .select("id, title, organizer_id")
    .eq("id", eventId)
    .maybeSingle<{ id: string; title: string; organizer_id: string }>();
  if (!event) notFound();

  const [{ count: checkedIn }, { count: total }] = await Promise.all([
    admin.from("tickets").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "used"),
    admin.from("tickets").select("id", { count: "exact", head: true }).eq("event_id", eventId).neq("status", "cancelled"),
  ]);

  return (
    <ScannerClient
      eventId={eventId}
      eventTitle={event.title}
      initialCounts={{ checkedIn: checkedIn ?? 0, total: total ?? 0 }}
      backHref={event.organizer_id === user.id ? `/dashboard/events/${eventId}/edit` : "/"}
    />
  );
}
