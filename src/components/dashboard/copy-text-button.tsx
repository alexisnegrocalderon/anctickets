"use client";

import { useState } from "react";

/** Botón "Copiar" para cualquier texto (links de embajador, link del escáner). */
export default function CopyTextButton({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copia este link:", text);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-[#f5f4f1] transition hover:border-[var(--anc-accent-light)] hover:text-[var(--anc-accent-light)]"
    >
      {copied ? "¡Copiado!" : label}
    </button>
  );
}
