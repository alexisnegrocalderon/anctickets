"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const POLL_MS = 3000;
const MAX_POLLS = 20; // ~1 minuto

/** Mientras el pago se confirma, refresca la página cada 3 s (hasta ~1 min). */
export default function OrderPoller() {
  const router = useRouter();
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    let polls = 0;
    const id = setInterval(() => {
      polls += 1;
      if (polls >= MAX_POLLS) {
        clearInterval(id);
        setGaveUp(true);
        return;
      }
      router.refresh();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [router]);

  return gaveUp ? (
    <p className="text-xs text-neutral-400">
      Mercado Pago está tardando más de lo normal. Puedes cerrar esta página: apenas se confirme el pago te
      enviaremos las entradas por correo y aparecerán aquí.
    </p>
  ) : (
    <p className="flex items-center gap-2 text-xs text-neutral-400">
      <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
      Esto se actualiza solo.
    </p>
  );
}
