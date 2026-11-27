"use client";

import { useState } from "react";
import ActionForm from "@/components/dashboard/action-form";
import type { NotifySales } from "@/lib/database.types";
import { saveNotifySales } from "./actions";

const OPTIONS: { value: NotifySales; title: string; help: string }[] = [
  { value: "each", title: "Cada venta", help: "Un correo apenas se vende una entrada." },
  { value: "daily", title: "Resumen diario", help: "Un solo correo al día con las ventas de ayer." },
  { value: "off", title: "No avisar", help: "Revisas tus ventas solo en el panel." },
];

export default function NotifySalesForm({ initial }: { initial: NotifySales }) {
  const [value, setValue] = useState<NotifySales>(initial);
  return (
    <ActionForm
      className="mt-4 flex flex-col gap-3"
      submitLabel="Guardar preferencia"
      submitClassName="self-start"
      action={async (prev, formData) => saveNotifySales(prev, formData)}
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Avisarme de las ventas</legend>
        {OPTIONS.map((o) => (
          <label
            key={o.value}
            className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-2 text-sm text-white transition ${
              value === o.value ? "border-[var(--anc-accent)] bg-white/[.06]" : "border-white/15"
            }`}
          >
            <input
              type="radio"
              name="notify_sales"
              value={o.value}
              checked={value === o.value}
              onChange={() => setValue(o.value)}
              className="h-4 w-4 accent-[var(--anc-accent)]"
            />
            <span className="font-semibold">
              {o.title}
              <span className="block text-xs font-normal text-neutral-400">{o.help}</span>
            </span>
          </label>
        ))}
      </fieldset>
    </ActionForm>
  );
}
