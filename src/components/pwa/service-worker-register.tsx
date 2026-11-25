"use client";

import { useEffect, useState } from "react";

/** Registra /sw.js (solo producción) y avisa cuando hay una versión nueva. */
export default function ServiceWorkerRegister() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    // Con skipWaiting + clients.claim el SW nuevo toma el control solo; si ya
    // había uno antes, la página sigue con código viejo hasta recargar.
    const hadController = !!navigator.serviceWorker.controller;
    const onControllerChange = () => {
      if (hadController) setUpdateReady(true);
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => {
        const check = () => void reg.update().catch(() => {});
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") check();
        });
      })
      .catch(() => {});

    return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  if (!updateReady) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 z-[70] mx-auto flex w-[calc(100%-2rem)] max-w-sm items-center justify-between gap-3 rounded-full border border-[var(--anc-border)] bg-[var(--anc-surface-2)] py-2 pl-5 pr-2 text-sm text-white shadow-lg"
      style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}
    >
      <span>Nueva versión disponible</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="min-h-11 rounded-full bg-[var(--anc-accent)] px-4 text-sm font-semibold text-[var(--anc-ink)]"
      >
        Actualizar
      </button>
    </div>
  );
}
