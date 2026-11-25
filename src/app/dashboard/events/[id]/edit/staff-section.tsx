import type { EventStaff } from "@/lib/database.types";
import { Card, Input } from "@/components/dashboard/ui";
import ActionForm from "@/components/dashboard/action-form";
import CopyTextButton from "@/components/dashboard/copy-text-button";
import { addEventStaff, removeEventStaff } from "../../actions";

export default function StaffSection({
  eventId,
  staff,
  scanUrl,
}: {
  eventId: string;
  staff: EventStaff[];
  scanUrl: string;
}) {
  return (
    <Card className="mb-6">
      <h2 className="mb-1 text-2xl uppercase text-white">Staff de puerta</h2>
      <p className="mb-4 text-sm text-neutral-400">
        Las personas que agregues pueden validar entradas con su teléfono (solo eso: no ven tus ventas ni editan el
        evento). Tienen que iniciar sesión con Google usando el mismo correo.
      </p>

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
        <code className="min-w-0 flex-1 truncate text-xs text-neutral-300">{scanUrl}</code>
        <CopyTextButton text={scanUrl} label="Copiar link del escáner" />
      </div>

      {staff.length > 0 ? (
        <div className="mb-5 divide-y divide-white/10 rounded-lg border border-white/10">
          {staff.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <p className="min-w-0 truncate text-sm text-[#f5f4f1]">{s.email}</p>
              <ActionForm
                action={removeEventStaff.bind(null, eventId, s.id)}
                submitLabel="Quitar"
                submitVariant="danger"
                submitClassName="px-3 py-1.5 text-xs"
                confirmMessage={`¿Quitar a ${s.email} del staff?`}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-5 text-sm text-neutral-400">Aún no agregas staff.</p>
      )}

      <ActionForm action={addEventStaff.bind(null, eventId)} submitLabel="+ Agregar" resetOnSuccess>
        <div className="mb-3">
          <Input name="email" type="email" required placeholder="correo@gmail.com" aria-label="Correo del staff" />
        </div>
      </ActionForm>
    </Card>
  );
}
