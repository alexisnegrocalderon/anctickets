import type { Ambassador } from "@/lib/database.types";
import { Card } from "@/components/dashboard/ui";
import ActionForm from "@/components/dashboard/action-form";
import AmbassadorTable, { type AmbassadorRow } from "@/components/dashboard/ambassador-table";
import AmbassadorFormFields from "./ambassador-form-fields";
import { createAmbassador, setAmbassadorActive } from "../../actions";

export default function AmbassadorsSection({
  eventId,
  eventSlug,
  site,
  ambassadors,
  stats,
}: {
  eventId: string;
  eventSlug: string;
  site: string;
  ambassadors: Ambassador[];
  stats: Record<string, { orders: number; tickets: number; grossBase: number }>;
}) {
  const rows: AmbassadorRow[] = ambassadors.map((a) => {
    const s = stats[a.id] ?? { orders: 0, tickets: 0, grossBase: 0 };
    return {
      id: a.id,
      name: a.name,
      email: a.email,
      code: a.code,
      active: a.active,
      scopeLabel: a.event_id ? "este evento" : "todos los eventos",
      commissionPercent: a.commission_percent === null ? null : Number(a.commission_percent),
      orders: s.orders,
      tickets: s.tickets,
      grossBase: s.grossBase,
      link: `${site}/${eventSlug}?ref=${a.code}`,
    };
  });

  const toggleActions = Object.fromEntries(
    ambassadors.map((a) => [a.id, setAmbassadorActive.bind(null, eventId, a.id, !a.active)])
  );

  return (
    <Card className="mb-6">
      <h2 className="mb-1 font-semibold text-[#f5f4f1]">Embajadores</h2>
      <p className="mb-4 text-sm text-neutral-400">
        Cada embajador tiene su propio link. Las compras hechas desde él (hasta 30 días después de visitarlo) quedan
        a su nombre. La tabla muestra solo las ventas de este evento.
      </p>

      <div className="mb-6">
        <AmbassadorTable rows={rows} toggleActions={toggleActions} />
      </div>

      <h3 className="mb-3 text-sm font-semibold text-neutral-300">Nuevo embajador</h3>
      <ActionForm action={createAmbassador.bind(null, eventId)} submitLabel="+ Crear embajador" resetOnSuccess>
        <AmbassadorFormFields />
      </ActionForm>
    </Card>
  );
}
