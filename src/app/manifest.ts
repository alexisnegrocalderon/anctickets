import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ANC Tickets",
    short_name: "ANC Tickets",
    description: "Crea tu evento, vende entradas y controla el acceso desde tu celular.",
    lang: "es-CL",
    id: "/dashboard/events",
    start_url: "/dashboard/events",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#1d1d1d",
    theme_color: "#1d1d1d",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Escáner",
        short_name: "Escáner",
        url: "/dashboard/entradas?tab=escaner",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Nuevo evento",
        short_name: "Nuevo evento",
        url: "/dashboard/events/new",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
