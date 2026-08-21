import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ANC Tickets",
  description:
    "Crea tu evento, vende entradas y recibe el pago directo en tu cuenta de Mercado Pago con costo de plataforma ANC $0.",
};

/** Estilo ANC: el layout raíz deja que cada experiencia controle su propia navegación y contraste. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#090909] text-[#f5f4f1]">{children}</body>
    </html>
  );
}
