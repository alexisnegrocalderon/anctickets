"use client";

import type { EntryMetric } from "@/lib/entry-metrics";

/** Suma un contador de las puertas sin esperar respuesta (sobrevive a la navegación). */
export function track(metric: EntryMetric) {
  try {
    const body = JSON.stringify({ m: metric });
    if (navigator.sendBeacon?.("/api/visitas", new Blob([body], { type: "application/json" }))) return;
    void fetch("/api/visitas", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
  } catch {
    // Medición: nunca debe romper la página.
  }
}
