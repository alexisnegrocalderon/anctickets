import type { Metadata, Viewport } from "next";
import { Anton, Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import SmoothScrollProvider from "@/components/smooth-scroll-provider";
import ServiceWorkerRegister from "@/components/pwa/service-worker-register";
import "./globals.css";
import "./brand.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Condensada y pesada: la letra de titular de la marca, para todo el sitio. */
const poster = Anton({
  variable: "--font-poster",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "ANC Tickets",
  description:
    "Ticketera express de ANC — crea tu evento, vende entradas y recibe el pago directo en tu cuenta de Mercado Pago.",
  applicationName: "ANC Tickets",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "ANC Tickets" },
  icons: { apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }] },
  verification: {
    google: "un3v2lf6NcECvU-S5gzE-bwUPxMjzGIj5rgbljVU8iE",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1d1d1d",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${poster.variable} h-full antialiased`}
    >
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-04VXQLWMNS"
          strategy="beforeInteractive"
        />
        <Script id="google-analytics" strategy="beforeInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-04VXQLWMNS');`}
        </Script>
        {/* Guarda el aviso de instalación antes de hidratar para el botón «Instalar app». */}
        <Script id="pwa-install-capture" strategy="beforeInteractive">
          {`window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__ancInstallPrompt=e;window.dispatchEvent(new Event('anc:installprompt'));});window.addEventListener('appinstalled',function(){window.__ancInstallPrompt=null;});`}
        </Script>
      </head>
      <body className="min-h-full">
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
