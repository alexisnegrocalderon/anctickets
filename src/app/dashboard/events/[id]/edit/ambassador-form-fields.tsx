"use client";

import { useState } from "react";
import { Field, Input } from "@/components/dashboard/ui";

function suggestCode(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
  return base.length >= 3 ? base : "";
}

/** Nombre + código del embajador: el código se sugiere solo a partir del nombre. */
export default function AmbassadorFormFields() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [touched, setTouched] = useState(false);

  return (
    <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Field label="Nombre">
        <Input
          name="name"
          required
          value={name}
          placeholder="Ej. Camila Rojas"
          onChange={(e) => {
            setName(e.target.value);
            if (!touched) setCode(suggestCode(e.target.value));
          }}
        />
      </Field>
      <Field label="Código del link">
        <Input
          name="code"
          required
          value={code}
          maxLength={32}
          placeholder="CAMILA"
          className="uppercase"
          onChange={(e) => {
            setTouched(true);
            setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""));
          }}
        />
      </Field>
      <Field label="Correo (opcional)">
        <Input name="email" type="email" placeholder="camila@correo.com" />
      </Field>
      <Field label="Comisión % (opcional, informativa)">
        <Input name="commission_percent" type="number" min="0" max="100" step="0.5" placeholder="10" />
      </Field>
      <Field label="Alcance">
        <select
          name="scope"
          defaultValue="event"
          className="w-full rounded-lg border border-white/15 bg-[#101010] px-3 py-2 text-sm text-[#f5f4f1] focus:border-[var(--anc-accent)] focus:outline-none"
        >
          <option value="event">Solo este evento</option>
          <option value="all">Todos mis eventos</option>
        </select>
      </Field>
    </div>
  );
}
