import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Event } from "@/lib/database.types";

/**
 * Link viejo (`/events/{id}`) — redirige al link canónico con slug (`/{slug}`)
 * para que los links ya compartidos antes de agregar slugs sigan funcionando.
 */
export default async function LegacyEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("slug")
    .eq("id", id)
    .single<Pick<Event, "slug">>();

  if (!event) notFound();

  const qs = new URLSearchParams(
    Object.entries(query).flatMap(([key, value]) =>
      value === undefined ? [] : Array.isArray(value) ? value.map((v) => [key, v]) : [[key, value]]
    )
  ).toString();

  redirect(`/${event.slug}${qs ? `?${qs}` : ""}`);
}
