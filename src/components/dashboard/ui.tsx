import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

/** ANC dashboard: kit compartido de UI — mismos tokens de color del resto del sitio. */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-white/10 bg-[#101010] p-5 sm:p-6 ${className}`}>
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
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold tracking-tight text-[#f5f4f1] sm:text-2xl">
          {title}
        </h1>
        {subtitle ? <p className="mt-1 text-sm text-neutral-400">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

const buttonVariants = {
  primary:
    "bg-[#a77fff] text-[#120d1b] hover:bg-[#c3adff]",
  outline:
    "border border-white/20 text-[#f5f4f1] hover:border-[#c3adff] hover:text-[#c3adff]",
  danger:
    "border border-red-500/40 text-red-300 hover:bg-red-500/10",
  dangerSolid: "bg-emerald-500 text-[#0b0b0b] hover:bg-emerald-400",
} as const;

type ButtonVariant = keyof typeof buttonVariants;

const buttonBase =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

export function Button({
  variant = "outline",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button className={`${buttonBase} ${buttonVariants[variant]} ${className}`} {...props} />
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
    </Link>
  );
}

const fieldClass =
  "w-full rounded-lg border border-white/15 bg-transparent px-3 py-2 text-sm text-[#f5f4f1] placeholder:text-neutral-500 transition focus:border-[#a77fff] focus:outline-none";

export function Field({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-neutral-300">
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
    neutral: "bg-white/10 text-neutral-300",
    success: "bg-emerald-500/15 text-emerald-300",
    danger: "bg-red-500/15 text-red-300",
  }[tone];

  return (
    <span className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${toneClass}`}>
      {children}
    </span>
  );
}
