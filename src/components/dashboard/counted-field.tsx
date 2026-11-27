"use client";

/** Campo de texto con contador de caracteres, ayuda, ejemplo y error por campo. */
import { useId, useState } from "react";
import { Textarea, Input } from "@/components/dashboard/ui";

function count(text: string) {
  return Array.from(text).length;
}

export function CountedTextarea({
  name,
  label,
  max,
  defaultValue = "",
  help,
  example,
  error,
  rows = 3,
  onValueChange,
}: {
  name: string;
  label: string;
  max: number;
  defaultValue?: string;
  help?: string;
  example?: string;
  error?: string | null;
  rows?: number;
  onValueChange?: (value: string) => void;
}) {
  const id = useId();
  const [value, setValue] = useState(defaultValue);
  const n = count(value);
  const over = n > max;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-[var(--anc-muted-text)]">
        {label}
      </label>
      <Textarea
        id={id}
        name={name}
        rows={rows}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onValueChange?.(e.target.value);
        }}
        aria-invalid={over || !!error}
        aria-describedby={`${id}-d`}
        className={over || error ? "!border-red-400" : ""}
      />
      <div id={`${id}-d`} className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-3 text-xs">
          <span className="min-w-0 text-neutral-400">{help}</span>
          <span className={`shrink-0 tabular-nums ${over ? "font-semibold text-red-400" : "text-neutral-500"}`} aria-live="polite">
            {n}/{max}
          </span>
        </div>
        {example ? <span className="text-xs text-neutral-500">Ejemplo: {example}</span> : null}
        {over ? (
          <span role="alert" className="text-xs text-red-400">
            Te pasaste por {n - max} caracteres.
          </span>
        ) : null}
        {error ? (
          <span role="alert" className="text-sm text-red-400">
            {error}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function TextField({
  name,
  label,
  defaultValue = "",
  help,
  example,
  error,
  type = "text",
  inputMode,
  maxLength,
  autoComplete,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  help?: string;
  example?: string;
  error?: string | null;
  type?: string;
  inputMode?: "text" | "email" | "tel" | "url";
  maxLength?: number;
  autoComplete?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-[var(--anc-muted-text)]">
        {label}
      </label>
      <Input
        id={id}
        name={name}
        type={type}
        inputMode={inputMode}
        maxLength={maxLength}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={`${id}-d`}
        className={error ? "!border-red-400" : ""}
      />
      <div id={`${id}-d`} className="flex flex-col gap-1 text-xs">
        {help ? <span className="text-neutral-400">{help}</span> : null}
        {example ? <span className="text-neutral-500">Ejemplo: {example}</span> : null}
        {error ? (
          <span role="alert" className="text-sm text-red-400">
            {error}
          </span>
        ) : null}
      </div>
    </div>
  );
}
