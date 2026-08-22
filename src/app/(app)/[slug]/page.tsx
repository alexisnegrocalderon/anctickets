import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Event, Profile, TicketType } from "@/lib/database.types";
import EventPublicView from "@/components/event-public-view";

async function getEvent(slug: string) {
  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .single<Event>();
  return event;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) return {};

  const description =
    event.description?.slice(0, 160) ??
    `${new Date(event.event_date).toLocaleDateString("es-CL", { dateStyle: "long" })}${
      event.venue ? ` · ${event.venue}` : ""
    } — entradas con ANC Tickets.`;

  return {
    title: `${event.title} — ANC Tickets`,
    description,
    openGraph: {
      title: event.title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description,
    },
  };
}

export default async function EventPublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const event = await getEvent(slug);
  if (!event) notFound();

  const { data: ticketTypes } = await supabase
    .from("ticket_types")
    .select("*")
    .eq("event_id", event.id)
    .order("base_price", { ascending: true })
    .returns<TicketType[]>();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { data: organizerProfile } = await admin
    .from("profiles")
    .select("organizer_name")
    .eq("id", event.organizer_id)
    .single<Pick<Profile, "organizer_name">>();

  return (
    <EventPublicView
      event={event}
      ticketTypes={ticketTypes}
      isLoggedIn={!!user}
      organizerName={organizerProfile?.organizer_name ?? null}
    />
  );
}
