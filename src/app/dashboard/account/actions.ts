"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { NotifySales } from "@/lib/database.types";

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
