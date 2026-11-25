"use client";

/**
 * Panel de un evento FICTICIO ("Noche Neón"): notificaciones de venta que
 * entran deslizándose, ingresos que suben y barra de entradas vendidas.
 * Todo es dato de ejemplo. Con reduced motion queda quieto en el estado final.
 */
import { useEffect, useRef, useState } from "react";
import { clp, useCountTo, useInView, useReducedMotion } from "./hooks";

const CAPACITY = 400;
const BASE_SOLD = 248;
const BASE_REVENUE = 2_980_000;

const SALES = [
  { n: 2, tier: "General", unit: 12_000 },
  { n: 1, tier: "VIP", unit: 25_000 },
  { n: 3, tier: "General", unit: 12_000 },
  { n: 2, tier: "VIP", unit: 25_000 },
  { n: 4, tier: "General", unit: 12_000 },
  { n: 1, tier: "General", unit: 12_000 },
];

const BARS = [18, 26, 22, 34, 41, 38, 52, 64, 58, 72, 88, 100];

type Toast = { id: number; n: number; tier: string; amount: number; fresh: boolean };

function makeToast(index: number, fresh: boolean, id = index): Toast {
  const s = SALES[index % SALES.length];
  return { id, n: s.n, tier: s.tier, amount: s.n * s.unit, fresh };
}

function totalsAfter(count: number) {
  let sold = BASE_SOLD;
  let revenue = BASE_REVENUE;
  for (let i = 0; i < count; i++) {
    const s = SALES[i % SALES.length];
    sold += s.n;
    revenue += s.n * s.unit;
  }
  return { sold, revenue };
}

export default function LiveSalesScreen({ variant = "hero" }: { variant?: "hero" | "full" }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, "80px");

  // Estado inicial = ya van 3 ventas (idéntico en servidor y cliente).
  const [state, setState] = useState(() => ({
    step: 3,
    toasts: [makeToast(2, false), makeToast(1, false), makeToast(0, false)],
  }));

  useEffect(() => {
    if (reduced || !inView) return;
    const id = window.setInterval(() => {
      setState((prev) => {
        const next = prev.step + 1;
        return {
          step: next >= SALES.length * 2 ? 3 : next,
          toasts: [makeToast(next - 1, true, next), ...prev.toasts].slice(0, 3),
        };
      });
    }, 2600);
    return () => window.clearInterval(id);
  }, [reduced, inView]);

  const { sold, revenue } = totalsAfter(state.step);
  const shownRevenue = useCountTo(revenue, reduced);
  const shownSold = useCountTo(sold, reduced);
  const pct = Math.min(100, (shownSold / CAPACITY) * 100);

  return (
    <div ref={ref} className="lv" data-variant={variant}>
      <div className="lv-bar">
        <span className="lv-title">Noche Neón</span>
        <span className="lv-tag">Ejemplo</span>
      </div>

      <div className="lv-card">
        <p className="lv-label">Ingresos</p>
        <p className="lv-money">{clp(shownRevenue)}</p>
        <div className="lv-meter" aria-hidden="true">
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="lv-sold">
          <strong>{shownSold}</strong> / {CAPACITY} entradas vendidas
        </p>
      </div>

      {variant === "full" ? (
        <div className="lv-chart" aria-hidden="true">
          <p className="lv-label">Ventas por hora</p>
          <div className="lv-bars">
            {BARS.map((h, i) => (
              <span key={i} style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      ) : null}

      <p className="lv-label lv-feed-label">Ventas en vivo</p>
      <ul className="lv-feed">
        {state.toasts.map((t) => (
          <li key={t.id} className={t.fresh ? "lv-toast lv-toast-new" : "lv-toast"}>
            <span className="lv-dot" aria-hidden="true">
              +
            </span>
            <span className="lv-toast-body">
              <span className="lv-toast-line">
                +{t.n} {t.n === 1 ? "entrada" : "entradas"} · {t.tier} · {clp(t.amount)}
              </span>
              <span className="lv-toast-sub">Pagado con Mercado Pago · ahora</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
