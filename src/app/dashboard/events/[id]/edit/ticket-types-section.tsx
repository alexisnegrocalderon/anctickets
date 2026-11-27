"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import type { TicketType } from "@/lib/database.types";
import { calculateFees } from "@/lib/fees";
import { isoToChileInput } from "@/lib/datetime";
import {
  formatChileDate,
  remainingTickets,
  sortTiers,
  tierStatus,
  type TierStatus,
} from "@/lib/tiers";
import { Button, Card } from "@/components/dashboard/ui";
import { CountedTextarea } from "@/components/dashboard/counted-field";
import ActionForm, { type ActionResult } from "@/components/dashboard/action-form";
import Sheet from "@/components/dashboard/sheet";
import TierFields, { EMPTY_TIER_DRAFT, PauseSwitch, type TierDraft } from "@/components/dashboard/tier-fields";
import { TierCountdown, TierStatusBadge, useTierClock } from "@/components/tier-status";
import {
  createTicketTypeForm,
  deleteTicketTypeForm,
  duplicateTicketType,
  setTicketTypePaused,
  updateTicketTypeForm,
} from "../../actions";

const clp = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`;

function draftFrom(tt: TicketType): TierDraft {
  return {
    name: tt.name,
    price: String(Number(tt.base_price)),
    quantity: String(tt.quantity),
    start: isoToChileInput(tt.sales_start),
    end: isoToChileInput(tt.sales_end),
    paused: !!tt.paused,
  };
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M13.5 3.5l3 3L7 16H4v-3l9.5-9.5Z" strokeLinejoin="round" />
    </svg>
  );
}

function dateLines(tt: TicketType, status: TierStatus): string[] {
  const lines: string[] = [];
  if (tt.sales_start) lines.push(`${status === "upcoming" ? "Abre" : "Abrió"} el ${formatChileDate(tt.sales_start)}`);
  if (tt.sales_end) lines.push(`${status === "ended" ? "Cerró" : "Cierra"} el ${formatChileDate(tt.sales_end)}`);
  if (lines.length === 0) lines.push("Sin fechas: se vende desde ya");
  return lines;
}

function TierCard({
  eventId,
  tt,
  now,
  onEdit,
}: {
  eventId: string;
  tt: TicketType;
  now: number;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [paused, setPaused] = useOptimistic(!!tt.paused);
  const [error, setError] = useState<string | null>(null);

  const status = tierStatus({ ...tt, paused }, now);
  const committed = tt.sold_count + tt.reserved_count;
  const pct = tt.quantity > 0 ? Math.min(100, Math.round((tt.sold_count / tt.quantity) * 100)) : 100;
  const fees = calculateFees(Number(tt.base_price));

  function togglePause(next: boolean) {
    setError(null);
    startTransition(async () => {
      setPaused(next);
      const res = await setTicketTypePaused(eventId, tt.id, next);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <li className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-base font-semibold text-[#f5f4f1]">{tt.name}</p>
          <p className="mt-0.5 text-sm text-neutral-400">
            {Number(tt.base_price) === 0 ? "Gratis" : `${clp(Number(tt.base_price))} · comprador paga ${clp(fees.totalAmount)}`}
          </p>
        </div>
        <TierStatusBadge status={status} />
      </div>

      <div className="mt-3">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-neutral-300">
            {tt.sold_count} de {tt.quantity} vendidas
          </span>
          <span className="text-xs text-neutral-500">
            {tt.reserved_count > 0 ? `${tt.reserved_count} reservadas · ` : ""}
            quedan {remainingTickets(tt)}
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={tt.quantity}
          aria-valuenow={tt.sold_count}
          aria-label={`${tt.name}: ${tt.sold_count} de ${tt.quantity} vendidas`}
          className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10"
        >
          <div className="h-full rounded-full bg-neutral-200" style={{ width: `${pct}%` }} />
        </div>
        {committed > tt.sold_count ? <span className="sr-only">Hay entradas reservadas en compras en curso</span> : null}
      </div>

      <div className="mt-3 space-y-0.5 text-sm text-neutral-300">
        {dateLines(tt, status).map((line) => (
          <p key={line}>{line}</p>
        ))}
        {status === "on_sale" && tt.sales_end ? (
          <TierCountdown endIso={tt.sales_end} now={now} className="font-semibold text-[#f5f4f1]" />
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
        <Button variant="outline" onClick={onEdit} aria-label={`Editar ${tt.name}`}>
          <PencilIcon />
          Editar
        </Button>
        <PauseSwitch compact checked={paused} onChange={togglePause} disabled={pending} label="Pausar venta" />
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-400">
          {error}
        </p>
      ) : null}
    </li>
  );
}

export default function TicketTypesSection({
  eventId,
  ticketTypes,
  serverNow,
  eventDateIso,
}: {
  eventId: string;
  ticketTypes: TicketType[];
  serverNow: number;
  eventDateIso: string;
}) {
  const sorted = useMemo(() => sortTiers(ticketTypes), [ticketTypes]);
  const now = useTierClock(serverNow, sorted);
  const eventDateLocal = isoToChileInput(eventDateIso);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TicketType | null>(null);
  const [draft, setDraft] = useState<TierDraft>(EMPTY_TIER_DRAFT);
  const [formKey, setFormKey] = useState(0);
  const [dupPending, startDup] = useTransition();
  const [dupResult, setDupResult] = useState<ActionResult>(null);

  function openCreate() {
    setEditing(null);
    setDraft(EMPTY_TIER_DRAFT);
    setDupResult(null);
    setFormKey((k) => k + 1);
    setOpen(true);
  }
  function openEdit(tt: TicketType) {
    setEditing(tt);
    setDraft(draftFrom(tt));
    setDupResult(null);
    setFormKey((k) => k + 1);
    setOpen(true);
  }
  const close = () => setOpen(false);

  const hasSales = editing ? editing.sold_count > 0 || editing.reserved_count > 0 : false;
  const priceChanged = editing ? draft.price !== "" && Number(draft.price) !== Number(editing.base_price) : false;

  return (
    <Card className="mb-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl uppercase text-white">Tandas de entradas</h2>
        <Button variant="primary" onClick={openCreate}>
          + Nueva tanda
        </Button>
      </div>

      {sorted.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {sorted.map((tt) => (
            <TierCard key={tt.id} eventId={eventId} tt={tt} now={now} onEdit={() => openEdit(tt)} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-neutral-400">Aún no agregas tandas. Cada tanda es un tipo de entrada con su propio precio, cupo y fechas.</p>
      )}

      <Sheet open={open} onClose={close} title={editing ? "Editar tanda" : "Nueva tanda"}>
        <div key={formKey} className="flex flex-col gap-5">
          <ActionForm
            className="flex flex-col gap-4"
            submitLabel={editing ? "Guardar cambios" : "Agregar tanda"}
            action={async (prev, formData) => {
              const res = editing
                ? await updateTicketTypeForm(eventId, editing.id, prev, formData)
                : await createTicketTypeForm(eventId, prev, formData);
              if (res?.ok) close();
              return res;
            }}
          >
            <TierFields
              idPrefix={`tier-${formKey}`}
              value={draft}
              onChange={setDraft}
              eventDateLocal={eventDateLocal}
              showPause
              minQuantity={editing ? editing.sold_count + editing.reserved_count : 0}
              priceNotice={
                hasSales && priceChanged ? "Los compradores anteriores conservan el precio que pagaron." : null
              }
            />
            <CountedTextarea
              name="email_note"
              label="Mensaje en el correo para esta entrada"
              max={300}
              rows={3}
              defaultValue={editing?.email_note ?? ""}
              help="Aparece junto a esta entrada en el correo. Opcional."
              example="Retira tu pulsera en la barra."
            />
          </ActionForm>

          {editing ? (
            <div className="flex flex-col gap-3 border-t border-white/10 pt-4">
              <Button
                variant="outline"
                disabled={dupPending}
                onClick={() =>
                  startDup(async () => {
                    const res = await duplicateTicketType(eventId, editing.id);
                    setDupResult(res);
                    if (res?.ok) close();
                  })
                }
              >
                {dupPending ? "Duplicando…" : "Duplicar tanda"}
              </Button>
              {dupResult?.error ? (
                <p role="alert" className="text-sm text-red-400">
                  {dupResult.error}
                </p>
              ) : null}

              {hasSales ? (
                <p className="text-sm text-neutral-400">
                  Esta tanda ya tiene ventas o compras en curso, así que no se puede eliminar. Puedes pausar la venta o
                  bajar el cupo hasta lo vendido.
                </p>
              ) : (
                <ActionForm
                  submitLabel="Eliminar tanda"
                  submitVariant="danger"
                  confirmMessage={`¿Eliminar la tanda "${editing.name}"?`}
                  action={async (prev) => {
                    const res = await deleteTicketTypeForm(eventId, editing.id, prev);
                    if (res?.ok) close();
                    return res;
                  }}
                />
              )}
            </div>
          ) : null}
        </div>
      </Sheet>
    </Card>
  );
}
