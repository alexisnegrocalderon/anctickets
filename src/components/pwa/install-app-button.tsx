"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import Sheet from "@/components/dashboard/sheet";
import {
  getCanPrompt,
  getIos,
  getIosNonSafari,
  getStandalone,
  promptInstall,
  subscribeInstall,
} from "@/lib/pwa-install";

const serverTrue = () => true;
const serverFalse = () => false;

export function InstallAppButton({
  variant = "primary",
  className,
}: {
  variant?: "primary" | "ghost" | "glass";
  className?: string;
}) {
  const standalone = useSyncExternalStore(subscribeInstall, getStandalone, serverTrue);
  const canPrompt = useSyncExternalStore(subscribeInstall, getCanPrompt, serverFalse);
  const ios = useSyncExternalStore(subscribeInstall, getIos, serverFalse);
  const iosNonSafari = useSyncExternalStore(subscribeInstall, getIosNonSafari, serverFalse);
  const [open, setOpen] = useState(false);

  if (standalone) return null;

  const glass = variant === "glass";
  const base = glass
    ? "gbtn gbtn--primary"
    : "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold transition active:scale-[.98]";
  const tone = glass
    ? ""
    : variant === "primary"
      ? "bg-[var(--anc-accent)] text-[var(--anc-ink)] hover:bg-[var(--anc-accent-light)]"
      : "border border-white/20 text-white hover:border-[var(--anc-accent-light)] hover:text-[var(--anc-accent-light)]";

  async function onClick() {
    if (canPrompt) {
      await promptInstall();
      return;
    }
    setOpen(true);
  }

  const guide = ios;

  return (
    <>
      <button type="button" onClick={onClick} className={`${base} ${tone} ${className ?? ""}`} data-glow={glass ? "" : undefined}>
        <DownloadIcon className="h-4 w-4" />
        {canPrompt || guide ? "Instalar app" : "Cómo instalar"}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title={guide ? "Instalar en tu iPhone" : "Instalar la app"}>
        {guide ? (
          <>
            {iosNonSafari ? (
              <p className="mb-4 rounded-xl border border-[var(--anc-vermilion)]/40 bg-[var(--anc-vermilion)]/10 p-3 text-sm text-white">
                Abre esta página en Safari para poder instalarla.
              </p>
            ) : null}
            <ol className="flex flex-col gap-3">
              <Step n={1} icon={<ShareIcon className="h-6 w-6" />} title="Toca el botón Compartir">
                Es el cuadrado con una flecha hacia arriba, en la barra de Safari.
              </Step>
              <Step n={2} icon={<AddHomeIcon className="h-6 w-6" />} title="Elige «Agregar a inicio»">
                Desliza hacia abajo en el menú si no la ves.
              </Step>
              <Step n={3} icon={<CheckIcon className="h-6 w-6" />} title="Toca «Agregar»">
                ANC Tickets queda en tu pantalla de inicio, como cualquier app.
              </Step>
            </ol>
          </>
        ) : (
          <div id="ayuda" className="flex flex-col gap-3 text-sm text-[var(--anc-muted-text)]">
            <p>Tu navegador no ofrece la instalación directa desde aquí. Prueba así:</p>
            <ul className="flex list-disc flex-col gap-2 pl-5">
              <li>
                <span className="text-white">Android:</span> abre esta página en Chrome, toca el menú (⋮) y elige
                «Instalar app» o «Agregar a la pantalla principal».
              </li>
              <li>
                <span className="text-white">iPhone o iPad:</span> ábrela en Safari, toca Compartir y elige «Agregar
                a inicio».
              </li>
              <li>
                <span className="text-white">Computador:</span> en Chrome o Edge, busca el ícono de instalar al
                final de la barra de direcciones.
              </li>
            </ul>
          </div>
        )}
      </Sheet>
    </>
  );
}

function Step({ n, icon, title, children }: { n: number; icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 rounded-2xl border border-[var(--anc-border)] bg-[var(--anc-bg)] p-3.5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--anc-vermilion)]/15 text-[var(--anc-vermilion)]">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-white">
          <span className="mr-1.5 font-mono text-xs text-[var(--anc-muted-text)]">{n}.</span>
          {title}
        </p>
        <p className="mt-0.5 text-sm text-[var(--anc-muted-text)]">{children}</p>
      </div>
    </li>
  );
}

type IconProps = { className?: string };
const svg = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, "aria-hidden": true } as const;

function ShareIcon({ className }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <path d="M12 15V4M8.5 7.5 12 4l3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 10H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1" strokeLinecap="round" />
    </svg>
  );
}

function AddHomeIcon({ className }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <rect x="4" y="4" width="16" height="16" rx="3.5" />
      <path d="M12 8.5v7M8.5 12h7" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ className }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.3 2.8 2.8L16.2 9.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadIcon({ className }: IconProps) {
  return (
    <svg {...svg} className={className}>
      <path d="M12 4v11M8 11.5l4 4 4-4M5 19h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
