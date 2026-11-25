import type { TicketType } from "@/lib/database.types";
import { calculateFees } from "@/lib/fees";
import { isoToChileInput } from "@/lib/datetime";
import { Card, Field, Input } from "@/components/dashboard/ui";
import ActionForm from "@/components/dashboard/action-form";
import { createTicketTypeForm, deleteTicketTypeForm, updateTicketTypeForm } from "../../actions";

const clp = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`;

export default function TicketTypesSection({
  eventId,
  ticketTypes,
}: {
  eventId: string;
  ticketTypes: TicketType[];
}) {
  return (
    <Card className="mb-6">
      <h2 className="mb-4 text-2xl uppercase text-white">Tipos de entrada</h2>

      {ticketTypes.length > 0 ? (
        <div className="mb-5 divide-y divide-white/10 rounded-lg border border-white/10">
          {ticketTypes.map((tt) => {
            const fees = calculateFees(Number(tt.base_price));
            const hasSales = tt.sold_count > 0 || tt.reserved_count > 0;
            return (
              <details key={tt.id} className="group px-4 py-3">
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#f5f4f1]">{tt.name}</p>
                    <p className="text-sm text-neutral-400">
                      {Number(tt.base_price) === 0
                        ? "Gratis"
                        : `${clp(Number(tt.base_price))} base · total comprador ${clp(fees.totalAmount)}`}{" "}
                      · vendidas {tt.sold_count}/{tt.quantity}
                      {tt.reserved_count > 0 ? ` · ${tt.reserved_count} reservadas` : ""}
                    </p>
                    {tt.sales_start || tt.sales_end ? (
                      <p className="text-xs text-neutral-500">
                        Venta{tt.sales_start ? ` desde ${isoToChileInput(tt.sales_start).replace("T", " ")}` : ""}
                        {tt.sales_end ? ` hasta ${isoToChileInput(tt.sales_end).replace("T", " ")}` : ""} (hora de Chile)
                      </p>
                    ) : null}
                  </div>
                  <span className="text-xs font-semibold text-[var(--anc-accent-light)] group-open:hidden">Editar</span>
                </summary>

                <div className="mt-4 flex flex-col gap-4">
                  <ActionForm
                    action={updateTicketTypeForm.bind(null, eventId, tt.id)}
                    submitLabel="Guardar entrada"
                    className="flex flex-col gap-3"
                  >
                    <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <Field label="Nombre">
                        <Input name="name" defaultValue={tt.name} required />
                      </Field>
                      <Field label="Precio base ($)">
                        <Input name="base_price" type="number" min="0" step="1" defaultValue={Number(tt.base_price)} required />
                      </Field>
                      <Field label={`Cupo (mín. ${tt.sold_count + tt.reserved_count})`}>
                        <Input
                          name="quantity"
                          type="number"
                          min={tt.sold_count + tt.reserved_count}
                          step="1"
                          defaultValue={tt.quantity}
                          required
                        />
                      </Field>
                      <Field label="Venta desde (hora Chile)">
                        <Input name="sales_start" type="datetime-local" defaultValue={isoToChileInput(tt.sales_start)} />
                      </Field>
                      <Field label="Venta hasta (hora Chile)">
                        <Input name="sales_end" type="datetime-local" defaultValue={isoToChileInput(tt.sales_end)} />
                      </Field>
                    </div>
                  </ActionForm>

                  <div>
                    <ActionForm
                      action={deleteTicketTypeForm.bind(null, eventId, tt.id)}
                      submitLabel="Eliminar entrada"
                      submitVariant="danger"
                      submitClassName="px-3 py-1.5 text-xs"
                      confirmMessage={`¿Eliminar la entrada "${tt.name}"?`}
                    />
                    {hasSales ? (
                      <p className="mt-1 text-xs text-neutral-500">
                        Tiene ventas o reservas: no se puede eliminar, pero puedes bajar el cupo hasta lo vendido.
                      </p>
                    ) : null}
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      ) : (
        <p className="mb-5 text-sm text-neutral-400">Aún no agregas tipos de entrada.</p>
      )}

      <ActionForm
        action={createTicketTypeForm.bind(null, eventId)}
        submitLabel="+ Agregar tipo de entrada"
        resetOnSuccess
      >
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input name="name" required placeholder="Nombre (ej. General)" aria-label="Nombre" />
          <Input name="base_price" type="number" min="0" step="1" required placeholder="Precio base ($, 0 = gratis)" aria-label="Precio base" />
          <Input name="quantity" type="number" min="0" step="1" required placeholder="Cupo" aria-label="Cupo" />
          <Field label="Venta desde (opcional, hora Chile)">
            <Input name="sales_start" type="datetime-local" />
          </Field>
          <Field label="Venta hasta (opcional, hora Chile)">
            <Input name="sales_end" type="datetime-local" />
          </Field>
        </div>
      </ActionForm>
    </Card>
  );
}
