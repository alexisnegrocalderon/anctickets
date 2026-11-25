import type { DiscountCode, TicketType } from "@/lib/database.types";
import { isoToChileInput } from "@/lib/datetime";
import { Badge, Card, Field, Input } from "@/components/dashboard/ui";
import ActionForm from "@/components/dashboard/action-form";
import { createDiscountCode, setDiscountCodeActive } from "../../actions";

function describe(code: DiscountCode) {
  return code.kind === "percent" ? `${code.value}% de descuento` : `$${code.value.toLocaleString("es-CL")} por entrada`;
}

export default function DiscountCodesSection({
  eventId,
  codes,
  ticketTypes,
}: {
  eventId: string;
  codes: DiscountCode[];
  ticketTypes: TicketType[];
}) {
  const typeName = new Map(ticketTypes.map((t) => [t.id, t.name]));

  return (
    <Card className="mb-6">
      <h2 className="mb-1 font-semibold text-[#f5f4f1]">Códigos de descuento</h2>
      <p className="mb-4 text-sm text-neutral-400">
        El comprador los escribe al elegir sus entradas. El cargo de servicio se calcula sobre el precio ya
        descontado.
      </p>

      {codes.length > 0 ? (
        <div className="mb-5 divide-y divide-white/10 rounded-lg border border-white/10">
          {codes.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-mono font-semibold text-[#f5f4f1]">
                  {c.code}
                  {!c.active ? <Badge>Inactivo</Badge> : null}
                </p>
                <p className="text-sm text-neutral-400">
                  {describe(c)} · usos {c.used_count}
                  {c.max_uses !== null ? `/${c.max_uses}` : ""}
                  {c.ticket_type_ids?.length
                    ? ` · solo ${c.ticket_type_ids.map((id) => typeName.get(id) ?? "?").join(", ")}`
                    : ""}
                </p>
                {c.valid_from || c.valid_until ? (
                  <p className="text-xs text-neutral-500">
                    Vigencia{c.valid_from ? ` desde ${isoToChileInput(c.valid_from).replace("T", " ")}` : ""}
                    {c.valid_until ? ` hasta ${isoToChileInput(c.valid_until).replace("T", " ")}` : ""} (hora de Chile)
                  </p>
                ) : null}
              </div>
              <ActionForm
                action={setDiscountCodeActive.bind(null, eventId, c.id, !c.active)}
                submitLabel={c.active ? "Desactivar" : "Activar"}
                submitVariant="outline"
                submitClassName="px-3 py-1.5 text-xs"
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-5 text-sm text-neutral-400">Aún no creas códigos.</p>
      )}

      <ActionForm action={createDiscountCode.bind(null, eventId)} submitLabel="+ Crear código" resetOnSuccess>
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Código">
            <Input name="code" required placeholder="EARLYBIRD" maxLength={32} className="uppercase" />
          </Field>
          <Field label="Tipo de descuento">
            <select
              name="kind"
              defaultValue="percent"
              className="w-full rounded-lg border border-white/15 bg-[#101010] px-3 py-2 text-sm text-[#f5f4f1] focus:border-[var(--anc-accent)] focus:outline-none"
            >
              <option value="percent">Porcentaje (%)</option>
              <option value="fixed">Monto fijo por entrada ($)</option>
            </select>
          </Field>
          <Field label="Valor">
            <Input name="value" type="number" min="1" step="1" required placeholder="20" />
          </Field>
          <Field label="Máximo de usos (vacío = sin límite)">
            <Input name="max_uses" type="number" min="1" step="1" />
          </Field>
          <Field label="Vigente desde (opcional, hora Chile)">
            <Input name="valid_from" type="datetime-local" />
          </Field>
          <Field label="Vigente hasta (opcional, hora Chile)">
            <Input name="valid_until" type="datetime-local" />
          </Field>
        </div>
        {ticketTypes.length > 0 ? (
          <fieldset className="mb-3">
            <legend className="mb-1 text-sm font-medium text-neutral-300">
              Aplica solo a (si no marcas ninguna, aplica a todas)
            </legend>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {ticketTypes.map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-sm text-neutral-300">
                  <input type="checkbox" name="ticket_type_ids" value={t.id} className="accent-[var(--anc-accent)]" />
                  {t.name}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
      </ActionForm>
    </Card>
  );
}
