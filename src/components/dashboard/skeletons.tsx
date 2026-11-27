import type { CSSProperties, ReactNode } from "react";
import "./skeleton.css";
import "./nav-feedback.css";
import Tico from "@/components/tico";

/**
 * Esqueletos de carga del panel y de Mis entradas. Replican el layout de cada
 * pantalla real (mismas medidas y tokens --anc-*) para que al llegar el
 * contenido no haya saltos. `data-route-loading` enciende la barra de progreso
 * superior mientras el esqueleto está en pantalla.
 */

function Bone({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <div className={`anc-skel ${className}`} style={style} aria-hidden="true" />;
}

function Busy({ label, className = "", children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={className} role="status" aria-busy="true" aria-live="polite" data-route-loading="">
      <span className="sr-only">{label}</span>
      {children}
      <div className="pointer-events-none fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] right-4 z-10 md:bottom-6" aria-hidden="true">
        <Tico pose="idle" width={56} />
      </div>
    </div>
  );
}

function HeaderBones({ subtitle = false, action = false }: { subtitle?: boolean; action?: boolean }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3" aria-hidden="true">
      <div className="min-w-0 max-w-full">
        <Bone className="h-[clamp(2rem,8vw,3rem)] w-[min(16rem,70vw)]" />
        {subtitle ? <Bone className="mt-1.5 h-5 w-[min(22rem,80vw)]" /> : null}
      </div>
      {action ? <Bone className="h-11 w-36 rounded-full" /> : null}
    </div>
  );
}

const card = "rounded-2xl border border-[var(--anc-border)] bg-[var(--anc-surface)]";

/** /dashboard/events */
export function EventsSkeleton() {
  return (
    <Busy label="Cargando tus eventos…">
      <HeaderBones action />
      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <li key={i} className={`${card} flex flex-col overflow-hidden`}>
            <Bone className="aspect-[4/3] w-full rounded-none" />
            <div className="flex flex-1 flex-col gap-3 p-4">
              <div className="min-w-0">
                <Bone className="h-7 w-4/5" />
                <Bone className="mt-0.5 h-5 w-3/5" />
              </div>
              <Bone className="mt-auto h-11 w-32 rounded-full" />
            </div>
          </li>
        ))}
      </ul>
    </Busy>
  );
}

/** Lista de eventos con ventas (dentro de /dashboard/entradas). */
export function EntradasListSkeleton() {
  return (
    <ul className="flex flex-col gap-3" aria-hidden="true" data-route-loading="">
      {[0, 1, 2].map((i) => (
        <li key={i} className={`${card} p-4`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Bone className="h-6 w-3/5" />
              <Bone className="mt-0.5 h-5 w-2/5" />
            </div>
            <Bone className="h-[26px] w-20 shrink-0 rounded-full" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[0, 1, 2].map((j) => (
              <div key={j}>
                <Bone className="h-4 w-14" />
                <Bone className="mt-0.5 h-7 w-12" />
              </div>
            ))}
          </div>
          <Bone className="mt-4 h-11 w-full rounded-full" />
        </li>
      ))}
    </ul>
  );
}

/** /dashboard/entradas */
export function EntradasSkeleton() {
  return (
    <Busy label="Cargando tus entradas…">
      <HeaderBones subtitle />
      <div
        className="mb-6 grid grid-cols-2 gap-1 rounded-full border border-[var(--anc-border)] bg-[var(--anc-surface)] p-1"
        aria-hidden="true"
      >
        <Bone className="h-11 rounded-full bg-[var(--anc-vermilion)]/20" />
        <Bone className="h-11 rounded-full bg-transparent" />
      </div>
      <EntradasListSkeleton />
    </Busy>
  );
}

/** /dashboard/account */
export function AccountSkeleton() {
  return (
    <Busy label="Cargando tu cuenta…" className="max-w-2xl">
      <HeaderBones />
      <div className="flex flex-col gap-4" aria-hidden="true">
        <section className={`${card} p-4 sm:p-6`}>
          <Bone className="h-4 w-24" />
          <Bone className="mt-1 h-7 w-48" />
          <Bone className="mt-4 h-4 w-16" />
          <Bone className="mt-1 h-6 w-64 max-w-full" />
        </section>
        <section className={`${card} p-4 sm:p-6`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="w-full min-w-0 sm:w-auto sm:flex-1">
              <Bone className="h-8 w-44" />
              <Bone className="mt-1 h-5 w-full max-w-sm" />
            </div>
            <Bone className="h-[26px] w-24 rounded-full" />
          </div>
        </section>
        <section className={`${card} p-4 sm:p-6`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="w-full min-w-0 sm:w-auto sm:flex-1">
              <Bone className="h-8 w-56" />
              <Bone className="mt-1 h-10 w-full max-w-md" />
            </div>
            <Bone className="h-11 w-36 rounded-full" />
          </div>
        </section>
        <Bone className="h-11 w-full rounded-full sm:w-40" />
      </div>
    </Busy>
  );
}

/** /dashboard/events/new (asistente) */
export function NewEventSkeleton() {
  return (
    <Busy label="Preparando el asistente…" className="mx-auto max-w-5xl">
      <div className="mb-3 flex items-stretch gap-1.5" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex min-h-11 min-w-0 flex-1 flex-col justify-center">
            <Bone className="h-1 rounded-full" />
          </div>
        ))}
      </div>
      <Bone className="mb-6 h-4 w-52" />
      <div className="grid gap-8 lg:grid-cols-[1fr_340px] lg:items-start" aria-hidden="true">
        <div className="flex min-w-0 flex-col gap-4">
          <Bone className="h-14 w-4/5" />
          <Bone className="h-10 w-full" />
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Bone key={i} className="h-28 rounded-2xl" />
            ))}
            <Bone className="col-span-2 h-20 rounded-2xl" />
          </div>
        </div>
        <Bone className="hidden h-80 rounded-2xl lg:block" />
      </div>
    </Busy>
  );
}

/** /dashboard/events/[id]/edit: evita heredar el esqueleto de la lista de eventos. */
export function EditEventSkeleton() {
  return (
    <Busy label="Cargando el evento…">
      <HeaderBones subtitle action />
      <div className="mb-6 flex gap-2 overflow-hidden" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <Bone key={i} className="h-11 w-24 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="flex flex-col gap-4" aria-hidden="true">
        {[0, 1].map((i) => (
          <section key={i} className={`${card} p-4 sm:p-6`}>
            <Bone className="h-7 w-40" />
            <Bone className="mt-4 h-11 w-full" />
            <Bone className="mt-3 h-11 w-full" />
          </section>
        ))}
      </div>
    </Busy>
  );
}

/** /mis-entradas (fuera del panel, con el encabezado del sitio) */
export function MisEntradasSkeleton() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 text-[#f5f4f1] sm:py-14">
      <div className="anc-progress" aria-hidden="true" />
      <Busy label="Cargando tus entradas…">
        <Bone className="h-4 w-24" />
        <Bone className="mt-1 h-10 w-64 max-w-full sm:h-12" />
        <div className="mt-8 flex flex-col gap-6" aria-hidden="true">
          {[0, 1].map((i) => (
            <section key={i} className={`${card} p-4 sm:p-6`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Bone className="h-7 w-3/5" />
                  <Bone className="mt-1 h-5 w-4/5" />
                </div>
                <Bone className="h-[26px] w-28 rounded-full" />
              </div>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-[#0d0d0d] p-4">
                  <Bone className="mx-auto h-5 w-24" />
                  <Bone className="mx-auto mt-3 h-[196px] w-[196px] rounded-lg" />
                  <Bone className="mx-auto mt-3 h-4 w-16" />
                </div>
              </div>
            </section>
          ))}
        </div>
      </Busy>
    </main>
  );
}
