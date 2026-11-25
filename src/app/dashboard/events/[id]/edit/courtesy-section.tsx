import type { TicketType } from "@/lib/database.types";
import { Card, Field, Input } from "@/components/dashboard/ui";
import ActionForm from "@/components/dashboard/action-form";
import { issueCourtesy } from "../../actions";

export default function CourtesySection({
  eventId,
  ticketTypes,
}: {
  eventId: string;
  ticketTypes: TicketType[];
}) {
  return (
    <Card className="mb-6">
      <h2 className="mb-1 text-2xl uppercase text-white">Cortesías</h2>
      <p className="mb-4 text-sm text-neutral-400">
        Emite entradas gratis a nombre de una persona (invitados, prensa, artistas). Descuentan del cupo y le llegan
        por correo con su QR.
      </p>

      {ticketTypes.length === 0 ? (
        <p className="text-sm text-neutral-400">Primero agrega un tipo de entrada.</p>
      ) : (
        <ActionForm action={issueCourtesy.bind(null, eventId)} submitLabel="Emitir cortesía" resetOnSuccess>
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Tipo de entrada">
              <select
                name="ticket_type_id"
                required
                className="w-full rounded-lg border border-white/15 bg-[#101010] px-3 py-2 text-sm text-[#f5f4f1] focus:border-[var(--anc-accent)] focus:outline-none"
              >
                {ticketTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({Math.max(t.quantity - t.sold_count - t.reserved_count, 0)} disp.)
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Cantidad">
              <Input name="quantity" type="number" min="1" max="20" step="1" defaultValue={1} required />
            </Field>
            <Field label="Nombre de quien recibe">
              <Input name="name" required placeholder="Nombre y apellido" />
            </Field>
            <Field label="Correo">
              <Input name="email" type="email" required placeholder="invitado@correo.com" />
            </Field>
          </div>
        </ActionForm>
      )}
    </Card>
  );
}
