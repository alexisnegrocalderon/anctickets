"use client";

import { useId, useState, useTransition } from "react";
import Sheet from "@/components/dashboard/sheet";
import { deleteOrganizer } from "@/app/admin/actions";
import { confirmationMatches } from "@/lib/admin-delete";

export interface DeleteSummary {
  eventos: number;
  tandas: number;
  codigos: number;
  embajadores: number;
  staff: number;
  ordenes: number;
  tieneMp: boolean;
}

/**
 * Zona de peligro: botón + hoja de confirmación para eliminar una productora.
 * La comparación aquí solo habilita el botón; la comprobación real (admin, bloqueos,
 * nombre) la repiten la server action y la función SQL.
 */
export default function DeleteControl({
  organizerId,
  organizerName,
  organizerEmail,
  maskedEmail,
  summary,
}: {
  organizerId: string;
  /** Nombre real (puede ser null: entonces hay que escribir el correo completo). */
  organizerName: string | null;
  organizerEmail: string | null;
  maskedEmail: string | null;
  summary: DeleteSummary;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputId = useId();
  const expected = organizerName?.trim() ? organizerName.trim() : (organizerEmail ?? "").trim();
  const usesEmail = !organizerName?.trim();
  const matches = confirmationMatches(typed, organizerName, organizerEmail);

  const close = () => {
    if (pending) return;
    setOpen(false);
    setTyped("");
    setError(null);
  };

  const rows: [string, number][] = [
    ["Eventos", summary.eventos],
    ["Tandas de entradas", summary.tandas],
    ["Códigos de descuento", summary.codigos],
    ["Embajadores", summary.embajadores],
    ["Staff de puerta", summary.staff],
    ["Órdenes sin vender (vencidas o abandonadas)", summary.ordenes],
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-red-500/50 px-5 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 active:scale-[.98] sm:w-auto"
      >
        Eliminar productora
      </button>

      <Sheet open={open} onClose={close} title="Eliminar productora">
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!matches || pending) return;
            setError(null);
            startTransition(async () => {
              try {
                const res = await deleteOrganizer(organizerId, typed);
                if (res?.error) setError(res.error);
              } catch (err) {
                // redirect() dentro de la acción lanza una señal que Next debe ver.
                if (typeof err === "object" && err && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) {
                  throw err;
                }
                setError("No se pudo completar la acción. No se borró nada; inténtalo de nuevo.");
              }
            });
          }}
        >
          <p role="note" className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm font-semibold text-red-100">
            Esto no se puede deshacer. Se borra la productora y su cuenta de acceso para siempre.
          </p>

          <div>
            <p className="text-sm text-neutral-300">
              Se borrará <strong className="break-words text-white">{organizerName?.trim() || "Sin nombre"}</strong>
              {maskedEmail ? <span className="break-all text-neutral-400"> ({maskedEmail})</span> : null} y todo lo que cuelga de ella:
            </p>
            <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
              {rows.map(([label, n]) => (
                <div key={label} className="contents">
                  <dt className="text-neutral-400">{label}</dt>
                  <dd className="text-right font-semibold text-white">{n}</dd>
                </div>
              ))}
            </dl>
          </div>

          {summary.tieneMp ? (
            <p className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-100">
              Tiene Mercado Pago conectado. Borramos lo que guardamos aquí, pero la autorización en su cuenta de Mercado Pago sigue
              activa hasta que ella la revoque.
            </p>
          ) : null}

          <div>
            <label htmlFor={inputId} className="text-sm text-neutral-300">
              Para confirmar, escribe {usesEmail ? "el correo completo" : "el nombre exacto"}:{" "}
              <strong className="break-all text-white select-none">{expected}</strong>
            </label>
            <input
              id={inputId}
              name="confirm"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onPaste={(e) => e.preventDefault()}
              onDrop={(e) => e.preventDefault()}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="done"
              disabled={pending}
              aria-invalid={typed.length > 0 && !matches}
              className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-transparent px-3.5 py-2 text-base text-white placeholder:text-neutral-500 transition focus:border-red-400 focus:outline-none"
              placeholder={usesEmail ? "Correo completo" : "Nombre de la productora"}
            />
          </div>

          <button
            type="submit"
            disabled={!matches || pending}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-red-600 px-5 text-sm font-bold text-white transition hover:bg-red-500 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
                Eliminando…
              </>
            ) : (
              "Eliminar para siempre"
            )}
          </button>
          <button
            type="button"
            onClick={close}
            disabled={pending}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-white/20 px-5 text-sm font-semibold text-white transition hover:border-white/50 disabled:opacity-50"
          >
            Cancelar
          </button>
          {error ? (
            <p role="alert" className="text-sm text-red-300">
              {error}
            </p>
          ) : null}
        </form>
      </Sheet>
    </>
  );
}
