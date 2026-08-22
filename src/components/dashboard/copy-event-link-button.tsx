"use client";

/** ANC dashboard: copia el link público del evento al portapapeles. */
import { useState } from "react";

const buttonBase =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-[#f5f4f1] transition hover:border-[#c3adff] hover:text-[#c3adff]";

export default function CopyEventLinkButton({
  eventId,
  className = "",
}: {
  eventId: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    const url = `${window.location.origin}/events/${eventId}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copia el link del evento:", url);
    }
  }

  return (
    <button type="button" onClick={handleCopy} className={`${buttonBase} ${className}`}>
      {copied ? "Copiado ✓" : "Copiar link"}
    </button>
  );
}
