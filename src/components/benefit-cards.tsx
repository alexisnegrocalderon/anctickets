/** Beneficios en tarjetas de cristal: dato grande + ícono SVG animado. Textos de siempre, sin cifras nuevas. */
import type { ReactNode } from "react";

const common = { viewBox: "0 0 48 48", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

const BENEFITS: { dato: string; titulo: string; detalle: string; icon: ReactNode }[] = [
  {
    dato: "0%",
    titulo: "comisión de plataforma",
    detalle: "No descontamos nada de lo que vendes.",
    icon: (
      <svg {...common} className="bi bi-pct">
        <circle cx="24" cy="24" r="19" className="bi-ring" />
        <path d="M32 16 16 32" />
        <circle cx="18" cy="18" r="2.6" />
        <circle cx="30" cy="30" r="2.6" />
      </svg>
    ),
  },
  {
    dato: "100%",
    titulo: "Pago directo a tu cuenta",
    detalle: "Cada venta cae en tu Mercado Pago, al instante.",
    icon: (
      <svg {...common} className="bi bi-pay">
        <rect x="6" y="13" width="36" height="26" rx="6" />
        <path d="M6 21h36" />
        <circle cx="33" cy="30" r="2.4" className="bi-coin" />
        <path d="M24 3v8m-4-4 4 4 4-4" className="bi-drop" />
      </svg>
    ),
  },
  {
    dato: "QR",
    titulo: "Control de acceso con QR",
    detalle: "Tu staff escanea desde su propio teléfono.",
    icon: (
      <svg {...common} className="bi bi-qr">
        <path d="M8 16V9a1 1 0 0 1 1-1h7M32 8h7a1 1 0 0 1 1 1v7M40 32v7a1 1 0 0 1-1 1h-7M16 40H9a1 1 0 0 1-1-1v-7" />
        <rect x="16" y="16" width="6" height="6" rx="1" />
        <rect x="26" y="26" width="6" height="6" rx="1" />
        <path d="M5 24h38" className="bi-scan" />
      </svg>
    ),
  },
  {
    dato: "Real",
    titulo: "Soporte en español",
    detalle: "Un equipo real, no un bot, cuando lo necesites.",
    icon: (
      <svg {...common} className="bi bi-chat">
        <path d="M8 12a5 5 0 0 1 5-5h22a5 5 0 0 1 5 5v15a5 5 0 0 1-5 5H21l-9 8v-8h-1a3 3 0 0 1-3-3Z" />
        <circle cx="17" cy="20" r="1.6" className="bi-d1" />
        <circle cx="24" cy="20" r="1.6" className="bi-d2" />
        <circle cx="31" cy="20" r="1.6" className="bi-d3" />
      </svg>
    ),
  },
];

export default function BenefitCards() {
  return (
    <div className="relative z-[1] px-4 py-10 sm:px-8 lg:px-12 lg:py-14">
      <ul className="mx-auto grid max-w-6xl grid-cols-1 gap-3 min-[560px]:grid-cols-2 lg:grid-cols-4 lg:gap-4 list-none p-0">
        {BENEFITS.map((b, i) => (
          <li key={b.titulo} className="reveal glass benefit" data-glow data-tilt data-reveal-delay={i * 90}>
            <span className="benefit-ico">{b.icon}</span>
            <p className="benefit-num">{b.dato}</p>
            <p className="benefit-title">{b.titulo}</p>
            <p className="benefit-text">{b.detalle}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
