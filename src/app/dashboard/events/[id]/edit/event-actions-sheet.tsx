"use client";

/** Acciones secundarias del evento en una hoja inferior (solo celular). */
import Link from "next/link";
import { useState } from "react";
import Sheet from "@/components/dashboard/sheet";
import CopyEventLinkButton from "@/components/dashboard/copy-event-link-button";
import EventNoticeSheet, { type NoticeSheetData } from "./event-notice-sheet";

const rowClass =
  "flex min-h-12 items-center justify-between rounded-xl border border-white/15 px-4 text-sm font-semibold text-white transition active:bg-white/10";

/** Botón de escritorio: abre la hoja de aviso a los compradores. */
export function NoticeButton({ eventId, notice }: { eventId: string; notice: NoticeSheetData }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-white/20 px-5 text-sm font-semibold text-white transition hover:border-[var(--anc-accent-light)] hover:text-[var(--anc-accent-light)] active:scale-[.98]"
      >
        Avisar a los compradores
      </button>
      <EventNoticeSheet open={open} onClose={() => setOpen(false)} eventId={eventId} data={notice} />
    </>
  );
}

export default function EventActionsSheet({
  slug,
  eventId,
  notice,
}: {
  slug: string;
  eventId: string;
  notice: NoticeSheetData;
}) {
  const [open, setOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);

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
          <button
            type="button"
            className={rowClass}
            onClick={() => {
              setOpen(false);
              setNoticeOpen(true);
            }}
          >
            Avisar a los compradores <span aria-hidden="true">→</span>
          </button>
        </div>
      </Sheet>
      <EventNoticeSheet open={noticeOpen} onClose={() => setNoticeOpen(false)} eventId={eventId} data={notice} />
    </div>
  );
}
