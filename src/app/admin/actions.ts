"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminEmails, requireAdmin } from "@/lib/admin";
import { confirmationMatches, deleteErrorMessage, normalizeProtectedEmails } from "@/lib/admin-delete";
import { removeStoragePrefix } from "@/lib/admin-storage";
import { isUuid } from "@/lib/admin-data";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Acciones de escritura del panel de administración: suspender, reactivar y
 * eliminar productoras. Una server action es un endpoint público: se puede llamar sin
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

/**
 * Elimina una productora y su cuenta de acceso. IRREVERSIBLE. Defensas, en orden:
 * admin (404 si no) -> id válido -> no es uno mismo -> no es cuenta protegida ->
 * el texto coincide con el nombre -> la función SQL vuelve a validar TODO dentro de
 * una transacción con bloqueo (ventas, pendientes, protegidas, confirmación).
 * Tras borrar, limpia Storage (mejor esfuerzo) y redirige con un aviso.
 */
export async function deleteOrganizer(organizerId: string, confirmText: string): Promise<AdminActionState> {
  const admin = await requireAdmin();
  if (typeof organizerId !== "string" || !isUuid(organizerId)) return { error: "Productora inválida." };
  if (typeof confirmText !== "string" || confirmText.length > 300) return { error: deleteErrorMessage("CONFIRMATION_MISMATCH") };
  if (organizerId === admin.id) return { error: deleteErrorMessage("PROTECTED_ACCOUNT") };

  const db = createAdminClient();
  const { data: profile } = await db
    .from("profiles")
    .select("organizer_name, email")
    .eq("id", organizerId)
    .maybeSingle<{ organizer_name: string | null; email: string | null }>();
  if (!profile) return { error: deleteErrorMessage("ORGANIZER_NOT_FOUND") };

  const protectedEmails = normalizeProtectedEmails(getAdminEmails());
  if (protectedEmails.includes((profile.email ?? "").trim().toLowerCase())) return { error: deleteErrorMessage("PROTECTED_ACCOUNT") };
  if (!confirmationMatches(confirmText, profile.organizer_name, profile.email)) return { error: deleteErrorMessage("CONFIRMATION_MISMATCH") };

  const { data, error } = await db.rpc("admin_delete_organizer", {
    p_organizer_id: organizerId,
    p_confirm: confirmText.trim(),
    p_admin_email: admin.email,
    p_protected_emails: protectedEmails,
  });
  if (error) {
    console.error("admin_delete_organizer falló:", error.message);
    return { error: deleteErrorMessage(error.message) };
  }

  // Limpieza de archivos: aislada. Un fallo no deshace el borrado, solo se avisa.
  let storageFailed = false;
  try {
    const res = await removeStoragePrefix(db.storage, "event-images", organizerId);
    storageFailed = res.failed;
    if (res.failed) console.error("Limpieza de Storage incompleta para la productora borrada", organizerId);
  } catch (err) {
    storageFailed = true;
    console.error("Limpieza de Storage falló:", err);
  }

  revalidatePath("/admin", "layout");
  const name = ((data as { nombre?: string | null } | null)?.nombre ?? profile.organizer_name ?? "Productora").slice(0, 80);
  const qs = new URLSearchParams({ borrada: name });
  if (storageFailed) qs.set("archivos", "pendiente");
  redirect(`/admin/productoras?${qs.toString()}`);
}
