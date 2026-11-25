"use client";

/** Acciones secundarias del evento en una hoja inferior (solo celular). */
import Link from "next/link";
import { useState } from "react";
import Sheet from "@/components/dashboard/sheet";
import CopyEventLinkButton from "@/components/dashboard/copy-event-link-button";

const rowClass =
  "flex min-h-12 items-center justify-between rounded-xl border border-white/15 px-4 text-sm font-semibold text-white transition active:bg-white/10";

export default function EventActionsSheet({ slug, eventId }: { slug: string; eventId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-white/20 px-5 text-sm font-semibold text-white transition active:scale-[.98]"
        aria-haspopup="dialog"
      >
        Más acciones
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Acciones">
        <div className="flex flex-col gap-3">
          <CopyEventLinkButton slug={slug} className="!min-h-12 !w-full !justify-between !rounded-xl !px-4" />
          <Link href={`/${slug}`} className={rowClass}>
            Ver página pública <span aria-hidden="true">→</span>
          </Link>
          <Link href={`/scan/${eventId}`} className={rowClass}>
            Validar entradas <span aria-hidden="true">→</span>
          </Link>
        </div>
      </Sheet>
    </div>
  );
}
