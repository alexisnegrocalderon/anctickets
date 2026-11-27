/**
 * /eventos — La Cartelera: pared vertical con un evento por pantalla, cuenta
 * regresiva, etiquetas reales de las tandas, reacciones con emoji y compra en
 * dos toques con el mismo formulario (y el mismo checkout) de la página del
 * evento. Todo sale de la base: eventos publicados con fecha futura.
 */
import type { Metadata } from "next";
import CarteleraWall, { type WallEvent } from "@/components/cartelera/cartelera-wall";
import { getVerifiedUser } from "@/lib/auth";
import { isReactionKey, type ReactionKey } from "@/lib/cartelera";
import type { Event, TicketType } from "@/lib/database.types";
import { resolveEventTheme } from "@/lib/event-themes";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { serverClock } from "@/lib/tiers";

export const metadata: Metadata = {
  title: "Próximos eventos — ANC Tickets",
  description: "La cartelera de ANC Tickets: los próximos eventos, con cuenta regresiva y entradas en dos toques.",
  alternates: { canonical: "/eventos" },
};

type EventRow = Pick<Event, "id" | "title" | "slug" | "venue" | "event_date" | "image_url" | "theme" | "accent_color" | "organizer_id">;

function first(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export default async function EventosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const serverNow = serverClock();

  const [{ data: eventRows }, user] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, slug, venue, event_date, image_url, theme, accent_color, organizer_id")
      .eq("status", "published")
      .gte("event_date", new Date(serverNow).toISOString())
      .order("event_date", { ascending: true })
      .limit(60)
      .returns<EventRow[]>(),
    getVerifiedUser(),
  ]);
  const events = eventRows ?? [];
  const ids = events.map((e) => e.id);

  // Tandas, conteos de reacciones, las mías y suspensiones, en paralelo. Cada
  // lectura es tolerante: si falla (p. ej. migración sin aplicar) la pared igual se ve.
  const [tiersRes, countsRes, mineRes, suspendedRes] = ids.length
    ? await Promise.all([
        supabase.from("ticket_types").select("*").in("event_id", ids).returns<TicketType[]>(),
        supabase.rpc("event_reaction_counts", { p_event_ids: ids }),
        user
          ? supabase.from("event_reactions").select("event_id, emoji").eq("user_id", user.id).in("event_id", ids)
          : Promise.resolve({ data: [] as { event_id: string; emoji: string }[] }),
        (async () => {
          try {
            const organizerIds = [...new Set(events.map((e) => e.organizer_id))];
            const { data, error } = await createAdminClient()
              .from("profiles")
              .select("id, suspended_at")
              .in("id", organizerIds);
            if (error || !data) return new Set<string>();
            return new Set(
              (data as { id: string; suspended_at: string | null }[]).filter((p) => p.suspended_at).map((p) => p.id),
            );
          } catch {
            return new Set<string>();
          }
        })(),
      ])
    : [{ data: [] as TicketType[] }, { data: [] }, { data: [] }, new Set<string>()];

  const tiersByEvent = new Map<string, TicketType[]>();
  for (const t of tiersRes.data ?? []) {
    const list = tiersByEvent.get(t.event_id) ?? [];
    list.push(t);
    tiersByEvent.set(t.event_id, list);
  }

  const counts = new Map<string, Partial<Record<ReactionKey, number>>>();
  for (const row of (countsRes.data ?? []) as { event_id: string; emoji: string; total: number }[]) {
    if (!isReactionKey(row.emoji)) continue;
    const c = counts.get(row.event_id) ?? {};
    c[row.emoji] = row.total;
    counts.set(row.event_id, c);
  }

  const mine = new Map<string, ReactionKey[]>();
  for (const row of (mineRes.data ?? []) as { event_id: string; emoji: string }[]) {
    if (!isReactionKey(row.emoji)) continue;
    mine.set(row.event_id, [...(mine.get(row.event_id) ?? []), row.emoji]);
  }

  const wall: WallEvent[] = events.map((e) => ({
    id: e.id,
    title: e.title,
    slug: e.slug,
    venue: e.venue,
    eventDate: e.event_date,
    imageUrl: e.image_url,
    theme: resolveEventTheme(e.theme, e.accent_color),
    tiers: (tiersByEvent.get(e.id) ?? []).sort((a, b) => a.base_price - b.base_price),
    counts: counts.get(e.id) ?? {},
    mine: mine.get(e.id) ?? [],
    salesSuspended: suspendedRes.has(e.organizer_id),
  }));

  const ref = first(params.ref);

  return (
    <CarteleraWall
      events={wall}
      serverNow={serverNow}
      isLoggedIn={!!user}
      focusSlug={first(params.e)}
      refCode={ref && /^[A-Za-z0-9_-]{3,32}$/.test(ref) ? ref : null}
    />
  );
}
