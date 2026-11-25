"use client";

/** Escáner QR de la puerta: busca, marca VÁLIDA en verde y sube el contador. */
import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "./hooks";

const START = 187;
const SOLD = 261;

/** Patrón QR de adorno, determinista (no codifica nada). */
const CELLS = (() => {
  const n = 11;
  const out: boolean[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const finder = (x < 3 && y < 3) || (x > 7 && y < 3) || (x < 3 && y > 7);
      out.push(finder ? true : ((x * 7 + y * 13 + x * y) % 5) % 2 === 0);
    }
  }
  return out;
})();

export default function ScannerScreen() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, "40px");
  // Estado inicial = VÁLIDA con 188 ingresados (también es el estático).
  const [valid, setValid] = useState(true);
  const [count, setCount] = useState(START + 1);

  useEffect(() => {
    if (reduced || !inView) return;
    let cancelled = false;
    const timers: number[] = [];
    const cycle = () => {
      if (cancelled) return;
      setValid(false);
      timers.push(
        window.setTimeout(() => {
          if (cancelled) return;
          setValid(true);
          setCount((c) => (c >= START + 12 ? START + 1 : c + 1));
        }, 2000),
      );
      timers.push(window.setTimeout(cycle, 4600));
    };
    cycle();
    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [reduced, inView]);

  return (
    <div ref={ref} className="sc" data-valid={valid}>
      <div className="lv-bar">
        <span className="lv-title">Escáner · Noche Neón</span>
        <span className="lv-tag">Ejemplo</span>
      </div>

      <div className="sc-count">
        <span className="lv-label">Ingresados</span>
        <span key={count} className="sc-num">
          {count}
          <small> / {SOLD}</small>
        </span>
      </div>

      <div className="sc-view">
        <i className="sc-corner sc-c1" />
        <i className="sc-corner sc-c2" />
        <i className="sc-corner sc-c3" />
        <i className="sc-corner sc-c4" />
        <div className="sc-qr">
          {CELLS.map((on, i) => (
            <span key={i} className={on ? "on" : undefined} />
          ))}
        </div>
        <span className="sc-line" />
      </div>

      <div className="sc-result">
        <div className="sc-ok">
          <span className="sc-check" aria-hidden="true">
            ✓
          </span>
          <span className="sc-ok-text">
            <strong>VÁLIDA</strong>
            <small>General · Entrada #0{count}</small>
          </span>
        </div>
        <p className="sc-hint">Apunta al QR de la entrada</p>
      </div>
    </div>
  );
}
