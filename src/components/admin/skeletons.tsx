import type { CSSProperties, ReactNode } from "react";
import "@/components/dashboard/skeleton.css";
import "@/components/dashboard/nav-feedback.css";

/** Esqueletos de carga de /admin: mismas medidas que las pantallas reales. */

function Bone({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <div className={`anc-skel ${className}`} style={style} aria-hidden="true" />;
}

function Busy({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" data-route-loading="">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

const card = "rounded-2xl border border-[var(--anc-border)] bg-[var(--anc-surface)]";

function Title({ sub = false }: { sub?: boolean }) {
  return (
    <div className="mb-5" aria-hidden="true">
      <Bone className="h-9 w-[min(14rem,60vw)]" />
      {sub ? <Bone className="mt-2 h-5 w-[min(22rem,80vw)]" /> : null}
    </div>
  );
}

export function AdminSummarySkeleton() {
  return (
    <Busy label="Cargando el resumen…">
      <Title sub />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <Bone key={i} className="h-[104px] rounded-2xl" />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <Bone key={i} className="h-[88px] rounded-2xl" />
        ))}
      </div>
      <section className={`${card} mt-6 p-4`} aria-hidden="true">
        <Bone className="h-6 w-40" />
        <Bone className="mt-4 h-32 w-full" />
      </section>
    </Busy>
  );
}

export function AdminOrganizersSkeleton() {
  return (
    <Busy label="Cargando las productoras…">
      <Title sub />
      <Bone className="h-11 w-full rounded-xl" />
      <div className="mt-3 flex gap-2 overflow-hidden" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <Bone key={i} className="h-11 w-32 shrink-0 rounded-full" />
        ))}
      </div>
      <ul className="mt-5 flex flex-col gap-3" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className={`${card} p-4`}>
            <Bone className="h-6 w-3/5" />
            <Bone className="mt-1 h-4 w-2/5" />
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((j) => (
                <Bone key={j} className="h-10" />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </Busy>
  );
}

export function AdminDetailSkeleton() {
  return (
    <Busy label="Cargando…">
      <Title sub />
      <div className="flex flex-col gap-4" aria-hidden="true">
        <Bone className="h-40 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Bone key={i} className="h-[88px] rounded-2xl" />
          ))}
        </div>
        <Bone className="h-56 rounded-2xl" />
      </div>
    </Busy>
  );
}

export function AdminHealthSkeleton() {
  return (
    <Busy label="Cargando la salud del sistema…">
      <Title sub />
      <ul className="flex flex-col gap-3" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <li key={i} className={`${card} p-4`}>
            <Bone className="h-6 w-1/2" />
            <Bone className="mt-2 h-4 w-4/5" />
          </li>
        ))}
      </ul>
    </Busy>
  );
}
