import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const heroImage =
  "https://files.manuscdn.com/user_upload_by_module/session_file/310519663820533004/tmjnuDhpwrWwdDyk.jpg";

export default async function Image() {
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
          src={heroImage}
          alt=""
          width={1200}
          height={630}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "grayscale(30%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(0deg, rgba(9,9,9,.97) 12%, rgba(9,9,9,.6) 55%, rgba(9,9,9,.4) 100%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 80% 20%, rgba(167,127,255,.5), transparent 45%)",
            display: "flex",
          }}
        />

        <div style={{ position: "relative", display: "flex", flexDirection: "column", padding: "64px" }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: "24px" }}>
            <span style={{ fontSize: 34, fontWeight: 900, letterSpacing: "-0.05em", color: "#f5f4f1" }}>
              ANC
            </span>
            <span style={{ fontSize: 34, fontWeight: 900, letterSpacing: "-0.05em", color: "#a77fff" }}>
              TICKETS
            </span>
          </div>

          <span
            style={{
              fontSize: 72,
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
              marginTop: "20px",
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
