import type { Metadata } from "next";
import { Anton, Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import SmoothScrollProvider from "@/components/smooth-scroll-provider";
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
  verification: {
    google: "un3v2lf6NcECvU-S5gzE-bwUPxMjzGIj5rgbljVU8iE",
  },
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
      </head>
      <body className="min-h-full">
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </body>
    </html>
  );
}
