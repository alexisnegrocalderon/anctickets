import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import type { Event } from "@/lib/database.types";
import { getMarkDataUri } from "@/lib/brand-assets";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .single<Event>();

  const mark = await getMarkDataUri();
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
          backgroundImage: event?.image_url
            ? undefined
            : "radial-gradient(circle at 86% 10%, rgba(167,127,255,.55), transparent 42%), radial-gradient(circle at 70% 90%, rgba(167,127,255,.22), transparent 38%), linear-gradient(135deg, #0d0d0f 0%, #090909 55%, #120c1c 100%)",
        }}
      >
        {event?.image_url ? (
          <>
            <img
              src={event.image_url}
              alt=""
              width={1200}
              height={630}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(0deg, rgba(9,9,9,.96) 8%, rgba(9,9,9,.6) 52%, rgba(9,9,9,.32) 100%)",
                display: "flex",
              }}
            />
          </>
        ) : (
          <img
            src={mark}
            alt=""
            width={520}
            height={520}
            style={{
              position: "absolute",
              right: "-70px",
              top: "-70px",
              opacity: 0.85,
            }}
          />
        )}

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
