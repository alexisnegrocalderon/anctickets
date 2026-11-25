"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import PendingMark from "@/components/dashboard/pending-mark";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

/** ANC dashboard: kit compartido de UI — mismos tokens de color del resto del sitio. */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-[var(--anc-border)] bg-[var(--anc-surface)] p-4 sm:p-6 ${className}`}>
      {children}
    </section>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0 max-w-full">
        <h1 className="text-[clamp(2rem,8vw,3rem)] uppercase leading-[.98] text-white [overflow-wrap:anywhere]">
          {title}
        </h1>
        {subtitle ? <p className="mt-1.5 text-sm text-[var(--anc-muted-text)]">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

const buttonVariants = {
  primary:
    "bg-[var(--anc-accent)] text-[var(--anc-ink)] hover:bg-[var(--anc-accent-light)]",
  outline:
    "border border-white/20 text-white hover:border-[var(--anc-accent-light)] hover:text-[var(--anc-accent-light)]",
  danger:
    "border border-red-500/40 text-red-300 hover:bg-red-500/10",
  dangerSolid: "bg-emerald-500 text-[#0b0b0b] hover:bg-emerald-400",
} as const;

type ButtonVariant = keyof typeof buttonVariants;

const buttonBase =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap min-h-11 rounded-full px-5 py-2 text-sm font-semibold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50";

export function Button({
  variant = "outline",
  className = "",
  children,
  disabled,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  // useFormStatus solo detecta el submit del <form> padre — si este botón no
  // está dentro de uno, pending queda siempre en false y no cambia nada.
  const { pending } = useFormStatus();
  const isPending = pending && type === "submit";

  return (
    <button
      type={type}
      className={`${buttonBase} ${buttonVariants[variant]} ${className}`}
      disabled={disabled || isPending}
      {...props}
    >
      {isPending ? (
        <>
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
          Guardando…
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function LinkButton({
  variant = "outline",
  className = "",
  href,
  children,
}: {
  variant?: ButtonVariant;
  className?: string;
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`${buttonBase} ${buttonVariants[variant]} ${className}`}>
      {children}
      <PendingMark />
    </Link>
  );
}

const fieldClass =
  "min-h-11 w-full rounded-xl border border-white/15 bg-transparent px-3.5 py-2 text-base text-white placeholder:text-neutral-500 sm:text-sm transition focus:border-[var(--anc-accent)] focus:outline-none";

export function Field({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-[var(--anc-muted-text)]">
      {label}
      {children}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldClass} ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${fieldClass} ${props.className ?? ""}`} />;
}

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "success" | "danger";
  children: ReactNode;
}) {
  const toneClass = {
    neutral: "bg-white/10 text-neutral-200",
    success: "bg-emerald-500/15 text-emerald-300",
    danger: "bg-red-500/15 text-red-300",
  }[tone];

  return (
    <span className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${toneClass}`}>
      {children}
    </span>
  );
}
