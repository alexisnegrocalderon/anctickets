import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import { fetchPosterDataUri, getMarkDataUri, getPosterFont } from "@/lib/brand-assets";
import type { Event } from "@/lib/database.types";
import { resolveEventTheme } from "@/lib/event-themes";
import { formatChileDate } from "@/lib/tiers";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Evento en ANC Tickets";

type Row = Pick<Event, "title" | "venue" | "event_date" | "image_url" | "theme" | "accent_color">;

/**
 * Tarjeta al compartir el link de un evento: su afiche de fondo (o los colores
 * de su tema si no tiene imagen), la fecha, el nombre y el lugar, con la marca
 * ANC Tickets. Lee con la llave pública: solo eventos publicados (RLS).
 */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const { data } = await supabase
    .from("events")
    .select("title, venue, event_date, image_url, theme, accent_color")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle<Row>();

  const [mark, anton] = await Promise.all([getMarkDataUri(), getPosterFont()]);
  const poster = { fontFamily: "Anton", fontWeight: 400, textTransform: "uppercase" as const };

  // Evento que no existe o no está publicado: tarjeta de marca, sin datos.
  const title = data?.title ?? "ANC Tickets";
  const theme = data
    ? resolveEventTheme(data.theme, data.accent_color)
    : { from: "#3a1a0c", to: "#121212", ink: "#ffffff", text: "#ff8256" };
  const photo = data ? await fetchPosterDataUri(data.image_url) : null;
  const when = data ? formatChileDate(data.event_date) : "";
  const titleSize = title.length > 34 ? 84 : title.length > 22 ? 104 : 128;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          backgroundColor: "#141414",
          backgroundImage: `linear-gradient(155deg, ${theme.from} 0%, ${theme.to} 78%)`,
        }}
      >
        {photo ? <img src={photo} alt="" width={1200} height={630} style={{ position: "absolute", inset: 0, objectFit: "cover" }} /> : null}
        {/* Degradado oscuro: el texto se lee sobre cualquier afiche. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage: "linear-gradient(180deg, rgba(0,0,0,.62) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,.5) 52%, rgba(0,0,0,.92) 100%)",
          }}
        />

        <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "44px 60px 50px", height: "100%", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", ...poster, fontSize: 36, letterSpacing: "0.06em" }}>
              <img src={mark} alt="" width={54} height={54} style={{ marginRight: 14 }} />
              <span style={{ color: "#ffffff" }}>ANC</span>
              <span style={{ color: "#fc4c13", marginLeft: 11 }}>TICKETS</span>
            </div>
            {data ? (
              <div style={{ display: "flex", ...poster, fontSize: 26, letterSpacing: "0.05em", color: "#1d1d1d", backgroundColor: "#ffd60a", padding: "9px 24px", borderRadius: 999 }}>
                Compra tus entradas
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {when ? (
              <span style={{ ...poster, fontSize: 44, letterSpacing: "0.04em", color: "#ffd60a", textShadow: "0 2px 16px rgba(0,0,0,.7)" }}>{when}</span>
            ) : null}
            <span style={{ ...poster, fontSize: titleSize, lineHeight: 0.95, color: "#ffffff", marginTop: 6, textShadow: "0 4px 30px rgba(0,0,0,.65)", maxWidth: 1080 }}>
              {title}
            </span>
            {data?.venue ? (
              <span style={{ marginTop: 14, fontSize: 36, fontWeight: 600, color: "#f2f2f2", textShadow: "0 2px 14px rgba(0,0,0,.7)" }}>{data.venue}</span>
            ) : null}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Anton", data: anton, weight: 400, style: "normal" }] },
  );
}
