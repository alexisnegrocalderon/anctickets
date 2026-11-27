"use client";

/**
 * ANC: hoja (sheet) que sube desde abajo. Siempre está montada y se anima con
 * transform (ver .anc-sheet en brand.css), así el cierre también es suave y
 * los formularios de dentro no pierden lo escrito. Escape o el fondo la cierran.
 */
import { useEffect, useId, type ReactNode } from "react";

export default function Sheet({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Más ancha en pantallas grandes (vista previa del correo). */
  wide?: boolean;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  return (
    <>
      <div className="anc-sheet-backdrop" data-open={open} onClick={onClose} aria-hidden="true" />
      <div
        className="anc-sheet"
        data-open={open}
        data-wide={wide || undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        inert={!open}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-white/20" aria-hidden="true" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-2xl uppercase text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-11 w-11 items-center justify-center rounded-full text-neutral-300 transition hover:bg-white/10 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </>
  );
}
