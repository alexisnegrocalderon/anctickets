"use client";

/**
 * "Avisar a los compradores": la productora elige Cambio o Cancelación, escribe
 * un mensaje (solo texto, hasta 500) y confirma viendo cuántos compradores lo
 * recibirán. El correo usa una plantilla fija de ANC. Muestra el historial.
 */
import { useState, useTransition } from "react";
import { Button } from "@/components/dashboard/ui";
import Sheet from "@/components/dashboard/sheet";
import { CountedTextarea } from "@/components/dashboard/counted-field";
import type { EventNotice } from "@/lib/database.types";
import { sendNotice } from "../../email-actions";

export interface NoticeSheetData {
  recipientCount: number;
  notices: EventNotice[];
  maxNotices: number;
}

const kindLabel = { changed: "Cambio", cancelled: "Cancelación" } as const;

function when(iso: string) {
  return new Date(iso).toLocaleString("es-CL", { timeZone: "America/Santiago", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function EventNoticeSheet({
  open,
  onClose,
  eventId,
  data,
}: {
  open: boolean;
  onClose: () => void;
  eventId: string;
  data: NoticeSheetData;
}) {
  const [kind, setKind] = useState<"changed" | "cancelled">("changed");
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<"write" | "confirm" | "done">("write");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ recipients: number; sent: number; failed: number } | null>(null);
  const [pending, startTransition] = useTransition();

  const left = data.maxNotices - data.notices.length;
  const n = data.recipientCount;
  const trimmed = message.trim();
  const tooLong = Array.from(message).length > 500;

  function review() {
    setError(null);
    if (!trimmed) return setError("Escribe el mensaje para tus compradores.");
    if (tooLong) return setError("El mensaje puede tener hasta 500 caracteres.");
    setStep("confirm");
  }

  function send() {
    setError(null);
    startTransition(async () => {
      const res = await sendNotice(eventId, kind, message);
      if (res.ok) {
        setResult({ recipients: res.recipients ?? 0, sent: res.sent ?? 0, failed: res.failed ?? 0 });
        setStep("done");
        setMessage("");
      } else {
        setError(res.error ?? "No pudimos enviar el aviso.");
        setStep("write");
      }
    });
  }

  function close() {
    onClose();
    // Deja el estado listo para la próxima vez, una vez cerrada la hoja.
    setTimeout(() => {
      setStep("write");
      setError(null);
    }, 450);
  }

  return (
    <Sheet open={open} onClose={close} title="Avisar a los compradores">
      <div className="flex flex-col gap-5">
        {step === "write" ? (
          <>
            <p className="text-sm text-neutral-400">
              Envía un correo a quienes ya tienen entradas. Solo puedes enviar {data.maxNotices} avisos por evento (te quedan{" "}
              {Math.max(left, 0)}) y uno cada 10 minutos.
            </p>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium text-[var(--anc-muted-text)]">¿Qué pasó?</legend>
              {(["changed", "cancelled"] as const).map((k) => (
                <label
                  key={k}
                  className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 text-sm font-semibold text-white transition ${
                    kind === k ? "border-[var(--anc-accent)] bg-white/[.06]" : "border-white/15"
                  }`}
                >
                  <input
                    type="radio"
                    name="notice_kind"
                    value={k}
                    checked={kind === k}
                    onChange={() => setKind(k)}
                    className="h-4 w-4 accent-[var(--anc-accent)]"
                  />
                  <span>
                    {k === "changed" ? "El evento cambió" : "El evento se canceló"}
                    <span className="block text-xs font-normal text-neutral-400">
                      {k === "changed" ? "Se incluyen la fecha y el lugar actuales." : "El correo dice que el evento fue cancelado."}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
            <CountedTextarea
              name="notice_message"
              label="Mensaje para tus compradores"
              max={500}
              rows={4}
              defaultValue={message}
              onValueChange={setMessage}
              help="Solo texto, sin enlaces."
              example="Cambiamos la hora de inicio a las 23:00. ¡Disculpa las molestias!"
            />
            {error ? (
              <p role="alert" className="text-sm text-red-400">
                {error}
              </p>
            ) : null}
            <Button variant="primary" onClick={review} disabled={left <= 0 || n === 0} className="w-full">
              Revisar y enviar
            </Button>
            {n === 0 ? <p className="text-sm text-neutral-400">Aún no hay compradores a quienes avisar.</p> : null}
          </>
        ) : null}

        {step === "confirm" ? (
          <>
            <div className="rounded-2xl border border-[var(--anc-vermilion)]/40 bg-[var(--anc-vermilion)]/10 p-4">
              <p className="text-lg font-semibold text-white">
                Se enviará a {n} {n === 1 ? "comprador" : "compradores"}
              </p>
              <p className="mt-1 text-sm text-neutral-300">
                Aviso de {kind === "changed" ? "cambio" : "cancelación"}. No se puede deshacer ni editar después de enviarlo.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 p-4">
              <p className="mb-1 text-xs font-bold uppercase tracking-[.14em] text-neutral-400">Tu mensaje</p>
              <p className="whitespace-pre-wrap break-words text-sm text-white">{trimmed}</p>
            </div>
            {error ? (
              <p role="alert" className="text-sm text-red-400">
                {error}
              </p>
            ) : null}
            <div className="flex flex-col gap-3">
              <Button variant="primary" onClick={send} disabled={pending} className="w-full">
                {pending ? "Enviando…" : `Enviar a ${n} ${n === 1 ? "comprador" : "compradores"}`}
              </Button>
              <Button onClick={() => setStep("write")} disabled={pending} className="w-full">
                Volver a editar
              </Button>
            </div>
          </>
        ) : null}

        {step === "done" && result ? (
          <div role="status" className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="text-lg font-semibold text-emerald-300">Aviso enviado</p>
            <p className="mt-1 text-sm text-neutral-200">
              {result.sent} de {result.recipients} correos salieron{result.failed > 0 ? ` y ${result.failed} fallaron` : ""}.
            </p>
            <Button onClick={close} className="mt-4 w-full">
              Listo
            </Button>
          </div>
        ) : null}

        <div className="border-t border-white/10 pt-4">
          <h3 className="mb-2 text-lg uppercase text-white">Avisos enviados</h3>
          {data.notices.length === 0 ? (
            <p className="text-sm text-neutral-400">Todavía no enviaste avisos de este evento.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.notices.map((nt) => (
                <li key={nt.id} className="rounded-xl border border-white/10 p-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-white">{kindLabel[nt.kind]}</span>
                    <span className="text-xs text-neutral-400">{when(nt.created_at)}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 break-words text-sm text-neutral-300">{nt.message}</p>
                  <p className="mt-1 text-xs text-neutral-400">
                    {nt.sent} de {nt.recipients} enviados{nt.failed > 0 ? ` · ${nt.failed} fallaron` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Sheet>
  );
}
