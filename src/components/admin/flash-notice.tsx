"use client";

import { useEffect, useState } from "react";

/**
 * Aviso de una sola vez: se muestra y limpia el parámetro de la URL, así que al
 * recargar o volver atrás ya no aparece.
 */
export default function FlashNotice({ message, detail, cleanPath }: { message: string; detail?: string; cleanPath: string }) {
  const [shown] = useState(message);
  useEffect(() => {
    try {
      window.history.replaceState(window.history.state, "", cleanPath);
    } catch {
      /* sin historial: el aviso igual se ve */
    }
  }, [cleanPath]);
  return (
    <section role="status" className="mb-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
      <p className="break-words text-sm font-semibold text-emerald-100">{shown}</p>
      {detail ? <p className="mt-1 break-words text-sm text-amber-200">{detail}</p> : null}
    </section>
  );
}
