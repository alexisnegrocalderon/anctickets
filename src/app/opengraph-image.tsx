import { ImageResponse } from "next/og";
import { getMarkDataUri } from "@/lib/brand-assets";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const mark = await getMarkDataUri();

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: "#090909",
          backgroundImage:
            "radial-gradient(circle at 86% 8%, rgba(167,127,255,.55), transparent 42%), radial-gradient(circle at 68% 92%, rgba(167,127,255,.22), transparent 38%), linear-gradient(135deg, #0d0d0f 0%, #090909 55%, #120c1c 100%)",
        }}
      >
        <img
          src={mark}
          alt=""
          width={560}
          height={560}
          style={{
            position: "absolute",
            right: "-90px",
            top: "50%",
            transform: "translateY(-50%)",
            opacity: 0.9,
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "72px",
            height: "100%",
            maxWidth: "760px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", marginBottom: "32px" }}>
            <span style={{ fontSize: 34, fontWeight: 900, letterSpacing: "-0.05em", color: "#f5f4f1" }}>
              ANC
            </span>
            <span style={{ fontSize: 34, fontWeight: 900, letterSpacing: "-0.05em", color: "#a77fff" }}>
              TICKETS
            </span>
          </div>

          <span
            style={{
              fontSize: 76,
              fontWeight: 900,
              color: "#f5f4f1",
              letterSpacing: "-0.05em",
              lineHeight: 1.02,
            }}
          >
            VENDE. COBRA DIRECTO.
          </span>
          <span
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: "#c3adff",
              marginTop: "22px",
            }}
          >
            Venta de entradas para productores en Chile — costo de plataforma $0.
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
