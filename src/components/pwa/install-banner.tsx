"use client";

import { useSyncExternalStore } from "react";
import {
  dismissBanner,
  getCanPrompt,
  getDismissed,
  getIos,
  getStandalone,
  subscribeDismiss,
  subscribeInstall,
} from "@/lib/pwa-install";
import { InstallAppButton } from "./install-app-button";

const serverTrue = () => true;
const serverFalse = () => false;

/** Banner descartable arriba de la lista de eventos. Solo si instalar es posible. */
export default function InstallBanner() {
  const standalone = useSyncExternalStore(subscribeInstall, getStandalone, serverTrue);
  const canPrompt = useSyncExternalStore(subscribeInstall, getCanPrompt, serverFalse);
  const ios = useSyncExternalStore(subscribeInstall, getIos, serverFalse);
  const dismissed = useSyncExternalStore(subscribeDismiss, getDismissed, serverTrue);

  if (standalone || dismissed || !(canPrompt || ios)) return null;

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-[var(--anc-border)] bg-[var(--anc-surface)] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="min-w-0">
        <p className="font-semibold text-white">Instala ANC Tickets en tu celular</p>
        <p className="mt-0.5 text-sm text-[var(--anc-muted-text)]">
          Ábrela como una app y escanea entradas incluso sin internet.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <InstallAppButton />
        <button
          type="button"
          onClick={dismissBanner}
          className="min-h-11 rounded-full px-4 text-sm font-semibold text-[var(--anc-muted-text)] hover:text-white"
        >
          Ahora no
        </button>
      </div>
    </div>
  );
}
