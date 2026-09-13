"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "¿Cuánto cuesta publicar un evento?",
    a: "Nada. Crear tu evento y publicarlo en ANC es gratis. No cobramos comisión de plataforma sobre tus ventas: el cargo de servicio del 10% lo paga quien compra la entrada.",
  },
  {
    q: "¿Cuándo recibo la plata de mis ventas?",
    a: "Apenas se confirma el pago. Cada venta llega directo a la cuenta de Mercado Pago de tu organización, la misma que tú conectaste — no pasa por una cuenta intermedia de ANC ni espera una liquidación nuestra.",
  },
  {
    q: "¿Necesito una cuenta de empresa para vender?",
    a: "No. Puedes conectar cualquier cuenta de Mercado Pago, personal o de organización, siempre que puedas operarla como vendedor.",
  },
  {
    q: "¿Cómo controlo el acceso el día del evento?",
    a: "Cada entrada tiene un código QR único. Tu staff lo escanea desde su propio teléfono con acceso a tu evento, y un código ya usado no vuelve a entrar.",
  },
  {
    q: "¿Qué pasa si necesito hacer un reembolso?",
    a: "Tú decides: puedes anular una entrada específica desde tu panel y el reembolso se procesa directo por Mercado Pago hacia el comprador.",
  },
];

export default function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="divide-y divide-[var(--anc-border)] border-y border-[var(--anc-border)]">
      {FAQS.map((item, index) => {
        const isOpen = open === index;
        return (
          <div key={item.q}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : index)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-6 py-6 text-left"
            >
              <span className="text-lg font-bold text-[var(--anc-ink)] sm:text-xl">{item.q}</span>
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--anc-ink)]/20 text-lg text-[var(--anc-purple-deep)] transition-transform duration-200"
                style={{ transform: isOpen ? "rotate(45deg)" : "none" }}
              >
                +
              </span>
            </button>
            <div
              className="grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
              <div className="min-h-0">
                <p className="max-w-[62ch] pb-6 text-base leading-6 text-[var(--anc-ink-muted)]">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
