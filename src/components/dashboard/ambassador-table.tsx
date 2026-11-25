"use client";

import { csvRow } from "@/lib/csv";
import { Button } from "@/components/dashboard/ui";
import CopyTextButton from "./copy-text-button";
import ActionForm, { type ActionResult } from "./action-form";

export interface AmbassadorRow {
  id: string;
  name: string;
  email: string | null;
  code: string;
  active: boolean;
  scopeLabel: string;
  commissionPercent: number | null;
  orders: number;
  tickets: number;
  grossBase: number;
  link: string;
}

const clp = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`;

/** Tabla de ventas por embajador, con link para compartir y exportación a CSV. */
export default function AmbassadorTable({
  rows,
  toggleActions,
}: {
  rows: AmbassadorRow[];
  /** Una acción por embajador (activar/desactivar), ya ligada a su id en el servidor. */
  toggleActions: Record<string, (prev: ActionResult) => Promise<ActionResult>>;
}) {
  function exportCsv() {
    const header = csvRow([
      "Embajador",
      "Correo",
      "Código",
      "Alcance",
      "Órdenes aprobadas",
      "Entradas",
      "Venta base bruta (CLP)",
      "Comisión %",
      "Comisión a pagar (CLP)",
      "Link",
    ]);
    const lines = rows.map((r) =>
      csvRow([
        r.name,
        r.email,
        r.code,
        r.scopeLabel,
        r.orders,
        r.tickets,
        r.grossBase,
        r.commissionPercent,
        r.commissionPercent !== null ? Math.round((r.grossBase * r.commissionPercent) / 100) : "",
        r.link,
      ])
    );
    const blob = new Blob(["﻿" + [header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "embajadores.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (rows.length === 0) {
    return <p className="text-sm text-neutral-400">Aún no tienes embajadores.</p>;
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wide text-neutral-400">
            <tr>
              <th className="px-3 py-2">Embajador</th>
              <th className="px-3 py-2 text-right">Órdenes</th>
              <th className="px-3 py-2 text-right">Entradas</th>
              <th className="px-3 py-2 text-right">Venta base</th>
              <th className="px-3 py-2 text-right">Comisión</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows.map((r) => (
              <tr key={r.id} className={r.active ? "" : "opacity-50"}>
                <td className="px-3 py-3">
                  <p className="font-medium text-[#f5f4f1]">{r.name}</p>
                  <p className="font-mono text-xs text-neutral-500">
                    {r.code} · {r.scopeLabel}
                    {r.active ? "" : " · inactivo"}
                  </p>
                </td>
                <td className="px-3 py-3 text-right">{r.orders}</td>
                <td className="px-3 py-3 text-right">{r.tickets}</td>
                <td className="px-3 py-3 text-right">{clp(r.grossBase)}</td>
                <td className="px-3 py-3 text-right">
                  {r.commissionPercent !== null ? (
                    <>
                      <span className="font-semibold text-[var(--anc-accent-light)]">
                        {clp((r.grossBase * r.commissionPercent) / 100)}
                      </span>
                      <span className="block text-xs text-neutral-500">{r.commissionPercent}%</span>
                    </>
                  ) : (
                    <span className="text-neutral-600">—</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <CopyTextButton text={r.link} label="Copiar link" />
                    <ActionForm
                      action={toggleActions[r.id]}
                      submitLabel={r.active ? "Desactivar" : "Activar"}
                      submitVariant="outline"
                      submitClassName="px-3 py-1.5 text-xs"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={exportCsv}>
          Exportar embajadores (CSV)
        </Button>
        <p className="text-xs text-neutral-500">
          La comisión es solo informativa: ANC no la paga, tú se la pagas a cada embajador.
        </p>
      </div>
    </div>
  );
}
