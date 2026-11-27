"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/site";
import type { Event, TicketType } from "@/lib/database.types";
import { parseEmailSettings, type EmailFieldErrors } from "@/lib/email/form";
import { renderTicketEmail, type TicketEmailData } from "@/lib/email/template";
import { eventToEmailData, sendEventNotice, readProducerName } from "@/lib/email/deliver";
import { sendTicketConfirmationEmail } from "@/lib/email/send";
import { maskEmail } from "@/lib/email/sanitize";
import { suspendedActionError } from "@/lib/suspension";

export type EmailActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: EmailFieldErrors;
} | null;

const PENDING_MIGRATION =
  "Esta función se activa cuando se aplique la actualización de la base de datos. Avísale a ANC.";

async function requireOwner(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // RLS + comparación explícita: solo el dueño del evento.
  const { data: event } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle<Event>();
  if (!event || event.organizer_id !== user.id) return { supabase, user, event: null as Event | null };
  return { supabase, user, event };
}

/** Guarda los textos del correo del evento. Valida todo en el servidor y devuelve errores por campo. */
export async function saveEmailSettings(eventId: string, _prev: EmailActionState, formData: FormData): Promise<EmailActionState> {
  try {
    const { supabase, event } = await requireOwner(eventId);
    if (!event) return { error: "No encontramos este evento." };

    const { values, errors } = parseEmailSettings(formData);
    if (Object.keys(errors).length > 0) return { error: "Revisa los campos marcados.", fieldErrors: errors };

    const { error } = await supabase
      .from("events")
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq("id", eventId);
    if (error) {
      if (error.code === "42703" || /column .* does not exist|schema cache/i.test(error.message)) return { error: PENDING_MIGRATION };
      if (error.code === "23514") return { error: "Alguno de los textos no cumple el formato permitido. Revísalos." };
      return { error: "No pudimos guardar los cambios. Intenta de nuevo." };
    }
    revalidatePath(`/dashboard/events/${eventId}/edit`);
    return { ok: true, message: "Correo guardado" };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: "No pudimos guardar los cambios. Intenta de nuevo." };
  }
}

function isRedirect(err: unknown) {
  return typeof err === "object" && err !== null && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_REDIRECT");
}

/** Datos de ejemplo del correo con los valores del formulario (aunque no estén guardados). */
async function buildSampleData(
  eventId: string,
  formData: FormData,
  userId: string,
  event: Event,
  isTest: boolean
): Promise<{ data: TicketEmailData } | { error: string; fieldErrors?: EmailFieldErrors }> {
  const { values, errors } = parseEmailSettings(formData);
  if (Object.keys(errors).length > 0) return { error: "Revisa los campos marcados.", fieldErrors: errors };

  const admin = createAdminClient();
  const { data: types } = await admin
    .from("ticket_types")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true })
    .limit(3)
    .returns<TicketType[]>();

  const sample = (types && types.length > 0 ? types : [{ name: "General", email_note: null } as Pick<TicketType, "name" | "email_note">]).map((t, i) => ({
    typeName: t.name,
    qrCode: `00000000-0000-4000-8000-00000000000${i + 1}`,
    holderName: "Tu nombre",
    note: t.email_note ?? null,
  }));

  const producerName = await readProducerName(admin, userId);
  return {
    data: {
      siteUrl: siteUrl(),
      kind: "sale",
      producerName,
      event: { ...eventToEmailData({ ...event, ...values }), useEventImage: values.email_use_event_image },
      tickets: sample,
      greetingName: "Camila",
      isTest,
    },
  };
}

/** HTML de la vista previa (se muestra en un iframe con sandbox y sin scripts). */
export async function previewEmail(eventId: string, formData: FormData): Promise<{ html?: string; error?: string; fieldErrors?: EmailFieldErrors }> {
  try {
    const { user, event } = await requireOwner(eventId);
    if (!event) return { error: "No encontramos este evento." };
    const built = await buildSampleData(eventId, formData, user.id, event, false);
    if ("error" in built) return built;
    return { html: renderTicketEmail(built.data).html };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: "No pudimos armar la vista previa." };
  }
}

const TEST_GAP_MS = 60_000;

/**
 * Envía un correo de prueba SOLO al correo de la sesión de quien lo pide, con
 * máximo 1 por minuto por usuario y evento (se registra en email_test_log).
 */
export async function sendTestEmail(eventId: string, formData: FormData): Promise<EmailActionState> {
  try {
    const { supabase, user, event } = await requireOwner(eventId);
    if (!event) return { error: "No encontramos este evento." };
    const to = user.email;
    if (!to) return { error: "Tu cuenta no tiene un correo para enviarte la prueba." };

    const suspended = await suspendedActionError(supabase, user.id);
    if (suspended) return { error: suspended };

    const built = await buildSampleData(eventId, formData, user.id, event, true);
    if ("error" in built) return built;

    const admin = createAdminClient();
    const since = new Date(Date.now() - TEST_GAP_MS).toISOString();
    const { data: recent, error: logError } = await admin
      .from("email_test_log")
      .select("created_at")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .gte("created_at", since)
      .limit(1);
    if (logError) return { error: PENDING_MIGRATION };
    if (recent && recent.length > 0) {
      const wait = Math.max(1, Math.ceil((TEST_GAP_MS - (Date.now() - new Date(recent[0].created_at).getTime())) / 1000));
      return { error: `Espera ${wait} s antes de pedir otra prueba.` };
    }

    const { data: row, error: insertError } = await admin
      .from("email_test_log")
      .insert({ event_id: eventId, user_id: user.id })
      .select("id")
      .single();
    if (insertError || !row) return { error: "No pudimos enviar la prueba. Intenta de nuevo." };
    // Si dos pruebas se cruzaron, solo queda la primera.
    const { count } = await admin
      .from("email_test_log")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .gte("created_at", since);
    if ((count ?? 0) > 1) {
      await admin.from("email_test_log").delete().eq("id", row.id);
      return { error: "Ya se está enviando una prueba. Espera un minuto." };
    }

    try {
      await sendTicketConfirmationEmail({ to, data: built.data });
    } catch (err) {
      await admin.from("email_test_log").delete().eq("id", row.id);
      console.error(`Correo de prueba falló (${maskEmail(to)}):`, err instanceof Error ? err.message : "error");
      return { error: "No pudimos enviar la prueba. Intenta de nuevo en un momento." };
    }
    return { ok: true, message: `Te enviamos una prueba a ${to}. Puede tardar un minuto en llegar.` };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: "No pudimos enviar la prueba." };
  }
}

/** Avisa a los compradores de un cambio o cancelación. Solo el dueño del evento. */
export async function sendNotice(
  eventId: string,
  kind: "cancelled" | "changed",
  message: string
): Promise<{ ok?: boolean; error?: string; recipients?: number; sent?: number; failed?: number }> {
  try {
    const { user, event } = await requireOwner(eventId);
    if (!event) return { error: "No encontramos este evento." };
    const res = await sendEventNotice(createAdminClient(), { event, userId: user.id, kind, message });
    revalidatePath(`/dashboard/events/${eventId}/edit`);
    return res.ok ? { ok: true, recipients: res.recipients, sent: res.sent, failed: res.failed } : { error: res.error };
  } catch (err) {
    if (isRedirect(err)) throw err;
    console.error("sendNotice falló:", err instanceof Error ? err.message : "error");
    return { error: "No pudimos enviar el aviso. Intenta de nuevo." };
  }
}
