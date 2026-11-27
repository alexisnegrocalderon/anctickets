import { ImageResponse } from "next/og";
import { getPosterFont, getTicoDataUri } from "@/lib/brand-assets";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "ANC Tickets — vive el evento: descubre fechas, compra entradas o crea el tuyo";

/**
 * Tarjeta al compartir el link principal (WhatsApp, Instagram, etc.): afiche de
 * fiesta con Anton gigante, Tico (la mascota) grande y las dos puertas del sitio.
 */
export default async function Image() {
  const [tico, anton] = await Promise.all([getTicoDataUri(), getPosterFont()]);
  const poster = { fontFamily: "Anton", fontWeight: 400, textTransform: "uppercase" as const };

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
          backgroundImage:
            "radial-gradient(circle at 82% 22%, rgba(252,76,19,.65), transparent 46%), radial-gradient(circle at 8% 104%, rgba(255,214,10,.38), transparent 42%), linear-gradient(150deg, #1d1d1d 0%, #121212 60%, #1c1022 100%)",
        }}
      >
        {/* Trama diagonal de afiche */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage: "repeating-linear-gradient(115deg, rgba(255,255,255,.055) 0px, rgba(255,255,255,.055) 2px, transparent 2px, transparent 30px)",
          }}
        />
        <img
          src={tico}
          alt=""
          width={500}
          height={500}
          style={{ position: "absolute", right: "52px", top: "62px", transform: "rotate(8deg)" }}
        />

        <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "50px 64px", height: "100%", width: "800px" }}>
          <div style={{ display: "flex", alignItems: "center", ...poster, fontSize: 40, letterSpacing: "0.06em" }}>
            <span style={{ color: "#ffffff" }}>ANC</span>
            <span style={{ color: "#fc4c13", marginLeft: 12 }}>TICKETS</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", flexDirection: "column", ...poster, fontSize: 150, lineHeight: 0.92, color: "#ffffff", textShadow: "0 4px 30px rgba(0,0,0,.55)" }}>
              <span>Vive el</span>
              <span style={{ color: "#ffd60a" }}>evento.</span>
            </div>
            <span style={{ marginTop: 22, fontSize: 29, fontWeight: 600, color: "#f0f0f0", lineHeight: 1.25, maxWidth: 620 }}>
              Descubre fechas, compra entradas o crea el tuyo en 2 minutos.
            </span>
          </div>

          <div style={{ display: "flex" }}>
            <div style={{ display: "flex", ...poster, fontSize: 30, letterSpacing: "0.04em", color: "#1d1d1d", backgroundColor: "#ffd60a", padding: "12px 28px", borderRadius: 999 }}>
              Próximos eventos
            </div>
            <div style={{ display: "flex", ...poster, fontSize: 30, letterSpacing: "0.04em", color: "#ffffff", backgroundColor: "#fc4c13", padding: "12px 28px", borderRadius: 999, marginLeft: 14 }}>
              Crea el tuyo
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Anton", data: anton, weight: 400, style: "normal" }] },
  );
}
