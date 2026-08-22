import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import type { Event } from "@/lib/database.types";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const fallbackImage =
  "https://files.manuscdn.com/user_upload_by_module/session_file/310519663820533004/tmjnuDhpwrWwdDyk.jpg";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .single<Event>();

  const title = event?.title ?? "ANC Tickets";
  const subtitle = event
    ? `${new Date(event.event_date).toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" })}${event.venue ? ` · ${event.venue}` : ""}`
    : "Venta directa de entradas";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          position: "relative",
          backgroundColor: "#090909",
        }}
      >
        <img
          src={event?.image_url ?? fallbackImage}
          alt=""
          width={1200}
          height={630}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "grayscale(20%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(0deg, rgba(9,9,9,.96) 8%, rgba(9,9,9,.55) 55%, rgba(9,9,9,.35) 100%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 82% 18%, rgba(167,127,255,.45), transparent 45%)",
            display: "flex",
          }}
        />

        <div style={{ position: "relative", display: "flex", flexDirection: "column", padding: "64px" }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: "28px" }}>
            <span style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.05em", color: "#f5f4f1" }}>
              ANC
            </span>
            <span style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.05em", color: "#a77fff" }}>
              TICKETS
            </span>
          </div>

          <span
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: "#c3adff",
              letterSpacing: "-0.01em",
              marginBottom: "14px",
            }}
          >
            {subtitle}
          </span>

          <span
            style={{
              fontSize: 68,
              fontWeight: 900,
              color: "#f5f4f1",
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              maxWidth: "1000px",
            }}
          >
            {title}
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
