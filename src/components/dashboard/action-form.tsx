"use client";

/**
 * Formulario del panel que muestra el resultado de una acción de servidor
 * (éxito o error legible) bajo el botón. A diferencia de `<form action>`, NO
 * borra lo que escribió el productor cuando la acción devuelve un error.
 */
import { Fragment, useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/dashboard/ui";

export type ActionResult = { ok?: boolean; error?: string; message?: string } | null;

export default function ActionForm({
  action,
  children,
  submitLabel,
  submitVariant = "primary",
  submitClassName = "",
  className = "",
  resetOnSuccess = false,
  confirmMessage,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  children?: ReactNode;
  submitLabel: ReactNode;
  submitVariant?: "primary" | "outline" | "danger" | "dangerSolid";
  submitClassName?: string;
  className?: string;
  resetOnSuccess?: boolean;
  /** Si viene, pide confirmación antes de enviar (acciones destructivas). */
  confirmMessage?: string;
}) {
  const [resetKey, setResetKey] = useState(0);
  const [state, setState] = useState<ActionResult>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        if (confirmMessage && !window.confirm(confirmMessage)) return;
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          try {
            const result = await action(state, formData);
            setState(result);
            if (result?.ok && resetOnSuccess) setResetKey((k) => k + 1);
          } catch (err) {
            // redirect() dentro de la acción lanza una señal que Next debe ver.
            if (
              typeof err === "object" &&
              err &&
              "digest" in err &&
              String((err as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")
            ) {
              throw err;
            }
            setState({ error: "No se pudo completar la acción. Intenta de nuevo." });
          }
        });
      }}
    >
      <Fragment key={resetKey}>{children}</Fragment>
      <Button type="submit" variant={submitVariant} className={submitClassName} disabled={pending}>
        {pending ? (
          <>
            <span
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
              aria-hidden="true"
            />
            Procesando…
          </>
        ) : (
          submitLabel
        )}
      </Button>
      {state?.error ? (
        <p role="alert" className="mt-2 text-sm text-red-400">
          {state.error}
        </p>
      ) : state?.ok && state.message ? (
        <p role="status" className="mt-2 text-sm text-emerald-400">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
