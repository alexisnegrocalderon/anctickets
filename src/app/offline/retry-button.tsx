"use client";

export default function RetryButton() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--anc-accent)] px-6 text-sm font-semibold text-[var(--anc-ink)] transition active:scale-[.98]"
    >
      Reintentar
    </button>
  );
}
