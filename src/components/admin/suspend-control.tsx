"use client";

import { useState } from "react";
import ActionForm from "@/components/dashboard/action-form";
import Sheet from "@/components/dashboard/sheet";
import { Button, Field, Textarea } from "@/components/dashboard/ui";
import { reactivateOrganizer, suspendOrganizer } from "@/app/admin/actions";

/**
 * Botón + hoja de confirmación para suspender o reactivar una productora.
 * La comprobación de admin NO está aquí: la hacen las server actions.
 */
export default function SuspendControl({
  organizerId,
  organizerName,
  suspended,
}: {
  organizerId: string;
  organizerName: string;
  suspended: boolean;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <Button variant={suspended ? "primary" : "outline"} onClick={() => setOpen(true)} className="w-full sm:w-auto">
        {suspended ? "Reactivar productora" : "Suspender productora"}
      </Button>

      <Sheet open={open} onClose={close} title={suspended ? "Reactivar productora" : "Suspender productora"}>
        {suspended ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-neutral-300">
              <strong className="text-white">{organizerName}</strong> podrá volver a vender entradas, publicar eventos y crear
              tandas. Queda registrado en la auditoría.
            </p>
            <ActionForm
              className="flex flex-col gap-3"
              submitLabel="Sí, reactivar"
              action={async (prev) => {
                const res = await reactivateOrganizer(organizerId, prev);
                if (res?.ok) close();
                return res;
              }}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-neutral-300">
              <strong className="text-white">{organizerName}</strong> no podrá vender entradas, emitir gratis ni cortesías, ni
              publicar eventos o crear tandas. Las entradas ya vendidas siguen siendo válidas y se pueden escanear.
            </p>
            <ActionForm
              className="flex flex-col gap-3"
              submitLabel="Suspender"
              action={async (prev, formData) => {
                const res = await suspendOrganizer(organizerId, prev, formData);
                if (res?.ok) close();
                return res;
              }}
            >
              <Field label="Motivo (obligatorio, queda registrado)">
                <Textarea name="reason" rows={3} required minLength={5} maxLength={500} placeholder="Ej.: reclamos de compradores sin resolver" />
              </Field>
            </ActionForm>
          </div>
        )}
      </Sheet>
    </>
  );
}
