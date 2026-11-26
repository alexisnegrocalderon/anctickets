"use client";

/**
 * Campos de una tanda (nombre, precio, cupo, fechas de venta y pausa). Los usan
 * el asistente de creación y la hoja de edición del evento. Los inputs llevan
 * `name` para que un <form> los envíe tal cual; el asistente lee el estado.
 */
import { chileLocalToIso } from "@/lib/datetime";
import { formatChileWhen, nowChileInput, todayEndChileInput, validateTierDates } from "@/lib/tiers";
import { Input } from "@/components/dashboard/ui";

export type TierDraft = {
  name: string;
  price: string;
  quantity: string;
  start: string;
  end: string;
  paused: boolean;
};

export const EMPTY_TIER_DRAFT: TierDraft = { name: "", price: "", quantity: "", start: "", end: "", paused: false };

const chip =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-4 text-sm font-semibold text-neutral-200 transition hover:border-white/40 hover:text-white active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40";

function DateTimeField({
  id,
  name,
  label,
  kind,
  value,
  onChange,
  eventDateLocal,
}: {
  id: string;
  name: string;
  label: string;
  kind: "open" | "close";
  value: string;
  onChange: (value: string) => void;
  eventDateLocal?: string;
}) {
  const iso = value ? chileLocalToIso(value) : null;
  const when = formatChileWhen(iso);
  const verb = kind === "open" ? "Abre" : "Cierra";

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-[var(--anc-muted-text)]">
        {label}
      </label>
      <Input
        id={id}
        name={name}
        type="datetime-local"
        step={60}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block min-w-0 max-w-full"
      />
      <div className="flex flex-wrap gap-2">
        {kind === "open" ? (
          <button type="button" className={chip} onClick={() => onChange(nowChileInput())}>
            Ahora
          </button>
        ) : (
          <>
            <button type="button" className={chip} onClick={() => onChange(todayEndChileInput())}>
              23:59 de hoy
            </button>
            <button
              type="button"
              className={chip}
              disabled={!eventDateLocal}
              onClick={() => eventDateLocal && onChange(eventDateLocal)}
            >
              Hasta el inicio del evento
            </button>
          </>
        )}
        <button type="button" className={chip} disabled={!value} onClick={() => onChange("")}>
          Limpiar
        </button>
      </div>
      <p className="text-xs text-neutral-400" aria-live="polite">
        {when
          ? `${verb} el ${when} (hora de Chile)`
          : kind === "open"
            ? "Hora de Chile. Déjalo vacío para vender desde ahora"
            : "Hora de Chile. Déjalo vacío para vender hasta el evento"}
      </p>
    </div>
  );
}

export function PauseSwitch({
  checked,
  onChange,
  disabled,
  label = "Pausar venta",
  name,
  compact,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
  name?: string;
  compact?: boolean;
}) {
  return (
    <>
      {name ? <input type="hidden" name={name} value={checked ? "on" : ""} /> : null}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`inline-flex min-h-11 items-center gap-3 rounded-full text-sm font-semibold text-white transition disabled:opacity-50 ${
          compact ? "pr-1" : "w-full justify-between rounded-xl border border-white/15 px-4"
        }`}
      >
        <span>{label}</span>
        <span
          aria-hidden="true"
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors ${
            checked ? "border-[var(--anc-vermilion)] bg-[var(--anc-vermilion)]" : "border-white/25 bg-white/10"
          }`}
        >
          <span
            className={`absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform motion-reduce:transition-none ${
              checked ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </span>
        <span className="sr-only">{checked ? "Activada" : "Desactivada"}</span>
      </button>
    </>
  );
}

export default function TierFields({
  idPrefix,
  value,
  onChange,
  eventDateLocal,
  showPause = false,
  minQuantity = 0,
  priceNotice,
}: {
  idPrefix: string;
  value: TierDraft;
  onChange: (next: TierDraft) => void;
  /** Fecha del evento como valor de datetime-local (hora de Chile). */
  eventDateLocal?: string;
  showPause?: boolean;
  minQuantity?: number;
  /** Se muestra bajo el precio (ej. aviso de compradores anteriores). */
  priceNotice?: string | null;
}) {
  const set = (patch: Partial<TierDraft>) => onChange({ ...value, ...patch });
  const eventIso = eventDateLocal ? chileLocalToIso(eventDateLocal) : null;
  const check = validateTierDates(value.start, value.end, eventIso);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-name`} className="text-sm font-medium text-[var(--anc-muted-text)]">
          Nombre de la tanda
        </label>
        <Input
          id={`${idPrefix}-name`}
          name="name"
          placeholder="Ej. Tanda 1 · General"
          value={value.name}
          onChange={(e) => set({ name: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${idPrefix}-price`} className="text-sm font-medium text-[var(--anc-muted-text)]">
            Precio base ($)
          </label>
          <Input
            id={`${idPrefix}-price`}
            name="base_price"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            placeholder="0 = gratis"
            value={value.price}
            onChange={(e) => set({ price: e.target.value })}
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${idPrefix}-qty`} className="text-sm font-medium text-[var(--anc-muted-text)]">
            Cupo{minQuantity > 0 ? ` (mín. ${minQuantity})` : ""}
          </label>
          <Input
            id={`${idPrefix}-qty`}
            name="quantity"
            type="number"
            inputMode="numeric"
            min={minQuantity}
            step="1"
            placeholder="Entradas"
            value={value.quantity}
            onChange={(e) => set({ quantity: e.target.value })}
            required
          />
        </div>
      </div>
      {priceNotice ? (
        <p role="status" className="rounded-xl border border-white/15 bg-white/[.04] px-3.5 py-2.5 text-sm text-neutral-200">
          {priceNotice}
        </p>
      ) : null}

      <fieldset className="flex min-w-0 flex-col gap-4 rounded-2xl border border-white/10 p-4">
        <legend className="px-1.5 font-mono text-[11px] font-bold uppercase tracking-[.14em] text-neutral-400">
          Fechas de venta (opcional)
        </legend>
        <DateTimeField
          id={`${idPrefix}-start`}
          name="sales_start"
          label="Abre"
          kind="open"
          value={value.start}
          onChange={(start) => set({ start })}
        />
        <DateTimeField
          id={`${idPrefix}-end`}
          name="sales_end"
          label="Cierra"
          kind="close"
          value={value.end}
          onChange={(end) => set({ end })}
          eventDateLocal={eventDateLocal}
        />
        {check.error ? (
          <p role="alert" className="text-sm text-red-400">
            {check.error}
          </p>
        ) : check.warning ? (
          <p role="status" className="text-sm text-amber-300">
            {check.warning} Puedes guardarla igual.
          </p>
        ) : null}
      </fieldset>

      {showPause ? (
        <PauseSwitch name="paused" checked={value.paused} onChange={(paused) => set({ paused })} label="Pausar venta" />
      ) : null}
    </div>
  );
}

/** ¿Hay un error de fechas que impida guardar? */
export function tierDraftError(value: TierDraft, eventDateLocal?: string): string | null {
  const eventIso = eventDateLocal ? chileLocalToIso(eventDateLocal) : null;
  return validateTierDates(value.start, value.end, eventIso).error ?? null;
}
