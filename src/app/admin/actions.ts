"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { isUuid } from "@/lib/admin-data";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Acciones de escritura del panel de administración: SOLO suspender y reactivar
 * productoras. Una server action es un endpoint público: se puede llamar sin
 * pasar por la página, así que cada una vuelve a exigir admin (404 si no lo es)
 * ANTES de leer ningún dato de la petición.
 */

export type AdminActionState = { ok?: boolean; error?: string; message?: string } | null;

const MAX_REASON = 500;

async function setSuspension(
  adminEmail: string,
  organizerId: string,
  suspend: boolean,
  reason: string | null
): Promise<AdminActionState> {
  const { data, error } = await createAdminClient().rpc("admin_set_suspension", {
    p_organizer_id: organizerId,
    p_suspend: suspend,
    p_reason: reason,
    p_admin_email: adminEmail,
  });
  if (error) {
    if (error.message.includes("ORGANIZER_NOT_FOUND")) return { error: "No encontramos a la productora." };
    if (error.message.includes("REASON_REQUIRED")) return { error: "Escribe el motivo de la suspensión." };
    console.error("admin_set_suspension falló:", error.message);
    return { error: "No se pudo guardar el cambio. Inténtalo de nuevo." };
  }
  revalidatePath("/admin", "layout");
  const changed = (data as { changed?: boolean } | null)?.changed !== false;
  if (!changed) return { ok: true, message: suspend ? "La productora ya estaba suspendida." : "La productora ya estaba activa." };
  return { ok: true, message: suspend ? "Productora suspendida." : "Productora reactivada." };
}

export async function suspendOrganizer(
  organizerId: string,
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const admin = await requireAdmin();
  if (!isUuid(organizerId)) return { error: "Productora inválida." };
  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 5) return { error: "Escribe el motivo de la suspensión (al menos 5 caracteres)." };
  if (reason.length > MAX_REASON) return { error: `El motivo no puede superar los ${MAX_REASON} caracteres.` };
  return setSuspension(admin.email, organizerId, true, reason);
}

export async function reactivateOrganizer(organizerId: string, _prev: AdminActionState): Promise<AdminActionState> {
  const admin = await requireAdmin();
  if (!isUuid(organizerId)) return { error: "Productora inválida." };
  return setSuspension(admin.email, organizerId, false, null);
}
