import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EntryMetric } from "@/lib/entry-metrics";

/**
 * Suma 1 al contador. Nunca rompe el flujo que la llama: si la tabla aún no
 * existe o la base no responde, se ignora en silencio (es solo medición).
 */
export async function bumpEntryMetric(metric: EntryMetric): Promise<void> {
  try {
    await createAdminClient().rpc("bump_entry_metric", { p_metric: metric });
  } catch {
    // Medición: no debe afectar la experiencia.
  }
}
