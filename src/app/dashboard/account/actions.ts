"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { NotifySales } from "@/lib/database.types";
import { getSupabase } from "@/lib/auth";
import { getSessionAssurance, isAdminUser } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export type NotifyState = { ok?: boolean; error?: string; message?: string } | null;

const VALUES: NotifySales[] = ["each", "daily", "off"];

/** Guarda cuándo avisar de las ventas a la productora (cada venta, resumen diario o nunca). */
export async function saveNotifySales(_prev: NotifyState, formData: FormData): Promise<NotifyState> {
  const value = String(formData.get("notify_sales") ?? "");
  if (!(VALUES as string[]).includes(value)) return { error: "Elige una de las opciones." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Inicia sesión de nuevo." };

  const { error } = await supabase.from("profiles").update({ notify_sales: value as NotifySales }).eq("id", user.id);
  if (error) {
    return {
      error:
        error.code === "42703" || /notify_sales|schema cache/i.test(error.message)
          ? "Esta opción se activa con la próxima actualización. Avísale a ANC."
          : "No pudimos guardar tu preferencia. Intenta de nuevo.",
    };
  }
  revalidatePath("/dashboard/account");
  return { ok: true, message: "Preferencia guardada" };
}

export type ResetMfaState = { ok?: boolean; error?: string; message?: string } | null;

/**
 * Restablece la verificación en 2 pasos del administrador (perdió el teléfono).
 * Exige una sesión iniciada con Google (amr 'oauth') de un administrador
 * vigente: estando con clave + código no se puede, para que quien robe la clave
 * y el código no pueda reemplazarlos. Elimina los factores TOTP del propio
 * usuario con el cliente de servicio, deja una fila en admin_audit y cierra
 * las demás sesiones.
 */
export async function resetTeamMfa(): Promise<ResetMfaState> {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email || !isAdminUser(user)) return { error: "No tienes permiso para esta acción." };

  const { amrMethods } = await getSessionAssurance();
  if (!amrMethods.includes("oauth")) {
    return { error: "Para restablecer, cierra sesión y vuelve a entrar con Google." };
  }

  const admin = createAdminClient();
  const { data: listed, error: listError } = await admin.auth.admin.mfa.listFactors({ userId: user.id });
  if (listError || !listed) {
    console.error("mfa_reset: no se pudieron leer los factores");
    return { error: "No se pudo restablecer. Inténtalo de nuevo." };
  }

  const totp = listed.factors.filter((f) => f.factor_type === "totp");
  for (const factor of totp) {
    const { error } = await admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId: user.id });
    if (error) {
      console.error("mfa_reset: no se pudo eliminar un factor");
      return { error: "No se pudo restablecer. Inténtalo de nuevo." };
    }
  }

  const { error: auditError } = await admin.from("admin_audit").insert({
    admin_email: user.email.trim().toLowerCase(),
    action: "admin.mfa_reset",
    target_type: "user",
    target_id: user.id,
    detail: { factors_removed: totp.length },
  });
  if (auditError) console.error("mfa_reset: no se pudo registrar la auditoría");

  // Las demás sesiones (otros aparatos) se cierran; esta sigue activa.
  await supabase.auth.signOut({ scope: "others" });

  revalidatePath("/dashboard/account");
  return { ok: true, message: "Listo. Ya puedes activar la verificación en 2 pasos de nuevo." };
}
