"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/slug";
import { isReservedSlug, safeSlug } from "@/lib/reserved-slugs";
import { isValidHex } from "@/lib/color";
import { chileLocalToIso } from "@/lib/datetime";
import { validateTierDates } from "@/lib/tiers";
import { normalizeCode } from "@/lib/discount";
import { deliverOrderEmail } from "@/lib/orders";
import { buildQuote, CheckoutError, friendlyRpcError, orderRpcArgs } from "@/lib/checkout";
import type { EventTheme } from "@/lib/database.types";

/** Resultado de las acciones de formulario del panel (se muestra bajo el botón). */
export type ActionState = { ok?: boolean; error?: string; message?: string } | null;

function fail(error: unknown): ActionState {
  return { error: error instanceof Error ? error.message : "Ocurrió un error inesperado" };
}

const EVENT_THEMES: EventTheme[] = ["magenta", "yellow", "turquoise", "charcoal", "custom"];

function readTheme(formData: FormData): EventTheme {
  const value = String(formData.get("theme") ?? "");
  return (EVENT_THEMES as string[]).includes(value) ? (value as EventTheme) : "magenta";
}

/** Un hex inválido nunca llega a la base: la página cae en el mood por defecto en vez de romperse. */
function readAccentColor(formData: FormData): string | null {
  const value = String(formData.get("accent_color") ?? "").trim();
  return value && isValidHex(value) ? value : null;
}

/** Solo URLs https (o vacío): evita javascript:/data: en las imágenes del evento. */
function readImageUrl(formData: FormData, field: string): string {
  const value = String(formData.get(field) ?? "").trim();
  if (!value) return "";
  if (!/^https:\/\//i.test(value)) throw new Error("La URL de la imagen debe empezar con https://");
  return value;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/**
 * Genera un slug único a partir del título — se llama una sola vez, al crear el
 * evento, para que el link público quede estable aunque el título se edite después.
 */
async function generateUniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  title: string
): Promise<string> {
  const base = safeSlug(title);
  let candidate = base;
  let attempt = 1;

  while (true) {
    const { data } = await supabase
      .from("events")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (!data) return candidate;

    attempt += 1;
    candidate = `${base}-${attempt}`;
  }
}

/**
 * Valida y normaliza un slug elegido a mano por el productor (para que el
 * link quede corto y fácil de recordar) al editar un evento ya creado.
 * Si ya está en uso por OTRO evento, lanza un error legible en vez de
 * pisarlo en silencio.
 */
async function resolveSlugForUpdate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  requestedSlug: string,
  fallbackSlug: string
): Promise<string> {
  const candidate = slugify(requestedSlug) || fallbackSlug;

  if (isReservedSlug(candidate) && candidate !== fallbackSlug) {
    throw new Error(`El link "${candidate}" está reservado por el sistema. Prueba con otro.`);
  }

  const { data } = await supabase
    .from("events")
    .select("id")
    .eq("slug", candidate)
    .neq("id", eventId)
    .maybeSingle();

  if (data) {
    throw new Error(`El link "${candidate}" ya está en uso por otro evento. Prueba con otro.`);
  }

  return candidate;
}

/**
 * Crea el evento como borrador y devuelve su id, sin redirigir — la usa el wizard
 * (`event-wizard.tsx`) para guardar apenas se completan los pasos obligatorios y
 * seguir operando sobre ese mismo evento en los pasos siguientes.
 */
export async function createDraftEvent(formData: FormData): Promise<{ id: string; slug: string }> {
  const { supabase, user } = await requireUser();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const venue = String(formData.get("venue") ?? "").trim();
  const eventDate = String(formData.get("event_date") ?? "");
  const imageUrl = readImageUrl(formData, "image_url");
  const theme = readTheme(formData);
  const accentColor = readAccentColor(formData);
  const organizerLogoUrl = readImageUrl(formData, "organizer_logo_url");
  const customSlug = String(formData.get("slug") ?? "").trim();

  if (!title || !eventDate) {
    throw new Error("Título y fecha son obligatorios");
  }

  // Si el productor eligió su propio link, se parte de ese texto en vez del
  // título; si ya está tomado, se le suma un sufijo en vez de fallar.
  const slug = await generateUniqueSlug(supabase, customSlug || title);

  const { data, error } = await supabase
    .from("events")
    .insert({
      organizer_id: user.id,
      title,
      slug,
      description: description || null,
      venue: venue || null,
      event_date: new Date(eventDate).toISOString(),
      image_url: imageUrl || null,
      theme,
      accent_color: accentColor,
      organizer_logo_url: organizerLogoUrl || null,
      status: "draft",
    })
    .select("id, slug")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo crear el evento");
  }

  revalidatePath("/dashboard/events");
  return { id: data.id, slug: data.slug };
}

export async function updateEvent(eventId: string, formData: FormData) {
  const { supabase } = await requireUser();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const venue = String(formData.get("venue") ?? "").trim();
  const eventDate = String(formData.get("event_date") ?? "");
  const imageUrl = readImageUrl(formData, "image_url");
  const theme = readTheme(formData);
  const accentColor = readAccentColor(formData);
  const organizerLogoUrl = readImageUrl(formData, "organizer_logo_url");
  const requestedSlug = String(formData.get("slug") ?? "").trim();

  const { data: current } = await supabase
    .from("events")
    .select("slug")
    .eq("id", eventId)
    .single();

  const slug = requestedSlug
    ? await resolveSlugForUpdate(supabase, eventId, requestedSlug, current?.slug ?? requestedSlug)
    : current?.slug;

  const { error } = await supabase
    .from("events")
    .update({
      title,
      description: description || null,
      venue: venue || null,
      event_date: new Date(eventDate).toISOString(),
      image_url: imageUrl || null,
      theme,
      accent_color: accentColor,
      organizer_logo_url: organizerLogoUrl || null,
      ...(slug ? { slug } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/events/${eventId}/edit`);
  revalidatePath("/dashboard/events");
  revalidatePath("/");
  if (current?.slug) revalidatePath(`/${current.slug}`);
  if (slug && slug !== current?.slug) revalidatePath(`/${slug}`);
}

/**
 * Cambia el estado del evento. Para publicar exige al menos un tipo de entrada
 * y, si alguna cuesta plata, Mercado Pago conectado. Devuelve `{ error }` en
 * vez de lanzar para que el mensaje llegue legible al productor.
 */
export async function setEventStatus(
  eventId: string,
  status: "draft" | "published" | "cancelled"
): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();

  if (status === "published") {
    const { data: ev } = await supabase
      .from("events")
      .select("title, event_date")
      .eq("id", eventId)
      .maybeSingle<{ title: string | null; event_date: string | null }>();
    if (!ev) return { error: "No encontramos este evento. Recarga la página e inténtalo de nuevo." };
    if (!ev.title?.trim()) return { error: "Pon un título al evento antes de publicar." };
    if (!ev.event_date) return { error: "Elige la fecha y hora del evento antes de publicar." };

    const { data: types } = await supabase
      .from("ticket_types")
      .select("base_price")
      .eq("event_id", eventId);

    if (!types || types.length === 0) {
      return { error: "Agrega al menos un tipo de entrada antes de publicar." };
    }

    const hasPaid = types.some((t) => Number(t.base_price) > 0);
    if (hasPaid) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("mp_connected")
        .eq("id", user.id)
        .single();
      if (!profile?.mp_connected) {
        return {
          error:
            "Conecta tu cuenta de Mercado Pago para publicar un evento con entradas de pago (así recibes el dinero directo).",
        };
      }
    }
  }

  const { error } = await supabase
    .from("events")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", eventId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/events/${eventId}/edit`);
  revalidatePath("/dashboard/events");
  revalidatePath("/");
  return {};
}

/** Versión para formularios del panel de `setEventStatus`. */
export async function changeEventStatus(
  eventId: string,
  status: "draft" | "published" | "cancelled",
  _prev: ActionState
): Promise<ActionState> {
  const res = await setEventStatus(eventId, status);
  return res.error ? { error: res.error } : { ok: true };
}

/** Guarda los datos del evento desde el panel y devuelve el resultado como estado. */
export async function saveEventForm(eventId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await updateEvent(eventId, formData);
    return { ok: true, message: "Cambios guardados" };
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return fail(err);
  }
}

function isRedirectError(err: unknown) {
  return typeof err === "object" && err !== null && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_REDIRECT");
}

/** Solo se puede borrar un evento sin ventas; si ya vendió, se cancela. */
export async function deleteEvent(eventId: string, _prev: ActionState): Promise<ActionState> {
  const { supabase } = await requireUser();

  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .in("status", ["approved", "refunded", "charged_back"]);

  if ((count ?? 0) > 0) {
    return {
      error: "Este evento ya tiene ventas, así que no se puede eliminar. Puedes cancelarlo en vez de borrarlo.",
    };
  }

  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) {
    return {
      error: error.message.includes("EVENT_HAS_SALES")
        ? "Este evento ya tiene ventas, así que no se puede eliminar. Puedes cancelarlo en vez de borrarlo."
        : error.message,
    };
  }

  revalidatePath("/dashboard/events");
  redirect("/dashboard/events");
}

// ---------------------------------------------------------------------------
// Tipos de entrada
// ---------------------------------------------------------------------------

function parseTicketTypeForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const basePrice = Number(formData.get("base_price"));
  const quantity = Number(formData.get("quantity"));
  const dates = validateTierDates(
    String(formData.get("sales_start") ?? ""),
    String(formData.get("sales_end") ?? "")
  );
  const pausedRaw = String(formData.get("paused") ?? "");
  const paused = pausedRaw === "on" || pausedRaw === "true";

  if (!name) throw new Error("Ponle un nombre a la entrada");
  if (!Number.isInteger(basePrice) || basePrice < 0) throw new Error("El precio debe ser un monto en pesos, sin decimales");
  if (!Number.isInteger(quantity) || quantity < 0) throw new Error("El cupo debe ser un número entero");
  if (dates.error) throw new Error(dates.error);

  return { name, basePrice, quantity, salesStart: dates.startIso, salesEnd: dates.endIso, paused };
}

/** Crea una tanda (tipo de entrada) y devuelve su id. Lo usan el panel y el asistente. */
export async function createTicketType(eventId: string, formData: FormData): Promise<{ id: string }> {
  const { supabase } = await requireUser();
  const t = parseTicketTypeForm(formData);

  const { data, error } = await supabase
    .from("ticket_types")
    .insert({
      event_id: eventId,
      name: t.name,
      base_price: t.basePrice,
      quantity: t.quantity,
      sales_start: t.salesStart,
      sales_end: t.salesEnd,
      paused: t.paused,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "No se pudo agregar la entrada");

  revalidatePath(`/dashboard/events/${eventId}/edit`);
  return { id: data.id };
}

export async function createTicketTypeForm(eventId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await createTicketType(eventId, formData);
    return { ok: true, message: "Tanda agregada" };
  } catch (err) {
    return fail(err);
  }
}

export async function updateTicketTypeForm(
  eventId: string,
  ticketTypeId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const { supabase } = await requireUser();
    const t = parseTicketTypeForm(formData);

    const { data: current } = await supabase
      .from("ticket_types")
      .select("sold_count, reserved_count")
      .eq("id", ticketTypeId)
      .eq("event_id", eventId)
      .single();
    if (!current) return { error: "Entrada no encontrada" };

    const committed = current.sold_count + current.reserved_count;
    if (t.quantity < committed) {
      return {
        error: `No puedes bajar el cupo de ${t.quantity}: ya hay ${current.sold_count} vendidas${
          current.reserved_count ? ` y ${current.reserved_count} reservadas` : ""
        }.`,
      };
    }

    // Cambiar el precio con ventas es válido: las órdenes ya creadas guardan el precio que pagaron.
    const { error } = await supabase
      .from("ticket_types")
      .update({
        name: t.name,
        base_price: t.basePrice,
        quantity: t.quantity,
        sales_start: t.salesStart,
        sales_end: t.salesEnd,
        paused: t.paused,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketTypeId)
      .eq("event_id", eventId);

    if (error) return { error: error.message };

    revalidatePath(`/dashboard/events/${eventId}/edit`);
    revalidatePath("/", "layout");
    return { ok: true, message: "Tanda actualizada" };
  } catch (err) {
    return fail(err);
  }
}

/** Pausa o reanuda la venta de una tanda sin tocar nada más. */
export async function setTicketTypePaused(eventId: string, ticketTypeId: string, paused: boolean): Promise<ActionState> {
  try {
    const { supabase } = await requireUser();
    const { data, error } = await supabase
      .from("ticket_types")
      .update({ paused, updated_at: new Date().toISOString() })
      .eq("id", ticketTypeId)
      .eq("event_id", eventId)
      .select("id");
    if (error) return { error: error.message };
    if (!data || data.length === 0) return { error: "Entrada no encontrada" };

    revalidatePath(`/dashboard/events/${eventId}/edit`);
    revalidatePath("/", "layout");
    return { ok: true, message: paused ? "Venta pausada" : "Venta reanudada" };
  } catch (err) {
    return fail(err);
  }
}

/**
 * Copia nombre, precio y cupo en una tanda nueva "<nombre> (copia)", sin fechas.
 * Nace pausada para que no salga a la venta antes de que el productor ponga sus fechas.
 */
export async function duplicateTicketType(eventId: string, ticketTypeId: string): Promise<ActionState> {
  try {
    const { supabase } = await requireUser();
    const { data: src } = await supabase
      .from("ticket_types")
      .select("name, base_price, quantity")
      .eq("id", ticketTypeId)
      .eq("event_id", eventId)
      .single();
    if (!src) return { error: "Entrada no encontrada" };

    const { error } = await supabase.from("ticket_types").insert({
      event_id: eventId,
      name: `${src.name} (copia)`,
      base_price: src.base_price,
      quantity: src.quantity,
      sales_start: null,
      sales_end: null,
      paused: true,
    });
    if (error) return { error: error.message };

    revalidatePath(`/dashboard/events/${eventId}/edit`);
    return { ok: true, message: "Tanda duplicada. Quedó pausada: ponle fechas y reanuda la venta." };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteTicketTypeForm(
  eventId: string,
  ticketTypeId: string,
  _prev: ActionState
): Promise<ActionState> {
  try {
    const { supabase } = await requireUser();

    const { data: tt } = await supabase
      .from("ticket_types")
      .select("sold_count, reserved_count")
      .eq("id", ticketTypeId)
      .eq("event_id", eventId)
      .single();
    if (!tt) return { error: "Entrada no encontrada" };

    const { count: itemCount } = await supabase
      .from("order_items")
      .select("id", { count: "exact", head: true })
      .eq("ticket_type_id", ticketTypeId);

    if (tt.sold_count > 0 || tt.reserved_count > 0 || (itemCount ?? 0) > 0) {
      return {
        error:
          "Esta entrada ya tiene ventas o compras en curso, así que no se puede eliminar. Puedes pausar la venta o dejar el cupo igual a lo vendido para cerrarla.",
      };
    }

    const { error } = await supabase.from("ticket_types").delete().eq("id", ticketTypeId).eq("event_id", eventId);
    if (error) return { error: error.message };

    revalidatePath(`/dashboard/events/${eventId}/edit`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ---------------------------------------------------------------------------
// Códigos de descuento
// ---------------------------------------------------------------------------

export async function createDiscountCode(eventId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { supabase } = await requireUser();

    const code = normalizeCode(String(formData.get("code") ?? ""));
    const kind = String(formData.get("kind") ?? "");
    const value = Number(formData.get("value"));
    const maxUsesRaw = String(formData.get("max_uses") ?? "").trim();
    const maxUses = maxUsesRaw ? Number(maxUsesRaw) : null;
    const fromRaw = String(formData.get("valid_from") ?? "").trim();
    const untilRaw = String(formData.get("valid_until") ?? "").trim();
    const validFrom = fromRaw ? chileLocalToIso(fromRaw) : null;
    const validUntil = untilRaw ? chileLocalToIso(untilRaw) : null;
    const ticketTypeIds = formData.getAll("ticket_type_ids").map(String).filter(Boolean);

    if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
      return { error: "El código debe tener entre 3 y 32 caracteres: letras, números, guion o guion bajo" };
    }
    if (kind !== "percent" && kind !== "fixed") return { error: "Elige si el descuento es en % o en pesos" };
    if (!Number.isInteger(value) || value <= 0) return { error: "El valor del descuento debe ser un número entero mayor a 0" };
    if (kind === "percent" && value > 100) return { error: "El porcentaje no puede superar 100" };
    if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses <= 0)) return { error: "El máximo de usos debe ser un entero mayor a 0" };
    if ((fromRaw && !validFrom) || (untilRaw && !validUntil)) return { error: "Fecha inválida" };
    if (validFrom && validUntil && new Date(validUntil) <= new Date(validFrom)) {
      return { error: "El fin de vigencia debe ser posterior al inicio" };
    }

    const { error } = await supabase.from("discount_codes").insert({
      event_id: eventId,
      code,
      kind,
      value,
      max_uses: maxUses,
      valid_from: validFrom,
      valid_until: validUntil,
      ticket_type_ids: ticketTypeIds.length ? ticketTypeIds : null,
    });

    if (error) {
      return { error: error.code === "23505" ? `Ya existe el código ${code} en este evento` : error.message };
    }

    revalidatePath(`/dashboard/events/${eventId}/edit`);
    return { ok: true, message: `Código ${code} creado` };
  } catch (err) {
    return fail(err);
  }
}

export async function setDiscountCodeActive(
  eventId: string,
  codeId: string,
  active: boolean,
  _prev: ActionState
): Promise<ActionState> {
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.from("discount_codes").update({ active }).eq("id", codeId).eq("event_id", eventId);
    if (error) return { error: error.message };
    revalidatePath(`/dashboard/events/${eventId}/edit`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ---------------------------------------------------------------------------
// Embajadores
// ---------------------------------------------------------------------------

export async function createAmbassador(eventId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { supabase, user } = await requireUser();

    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const code = normalizeCode(String(formData.get("code") ?? ""));
    const scope = String(formData.get("scope") ?? "event");
    const commissionRaw = String(formData.get("commission_percent") ?? "").trim();
    const commission = commissionRaw ? Number(commissionRaw) : null;

    if (!name) return { error: "Ponle un nombre al embajador" };
    if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
      return { error: "El código debe tener entre 3 y 32 caracteres: letras, números, guion o guion bajo" };
    }
    if (commission !== null && (!Number.isFinite(commission) || commission < 0 || commission > 100)) {
      return { error: "La comisión debe estar entre 0 y 100" };
    }

    const { error } = await supabase.from("ambassadors").insert({
      organizer_id: user.id,
      event_id: scope === "all" ? null : eventId,
      name,
      email: email || null,
      code,
      commission_percent: commission,
    });

    if (error) {
      return { error: error.code === "23505" ? `Ya usas el código ${code} con otro embajador` : error.message };
    }

    revalidatePath(`/dashboard/events/${eventId}/edit`);
    return { ok: true, message: `Embajador ${name} creado` };
  } catch (err) {
    return fail(err);
  }
}

export async function setAmbassadorActive(
  eventId: string,
  ambassadorId: string,
  active: boolean,
  _prev: ActionState
): Promise<ActionState> {
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.from("ambassadors").update({ active }).eq("id", ambassadorId);
    if (error) return { error: error.message };
    revalidatePath(`/dashboard/events/${eventId}/edit`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ---------------------------------------------------------------------------
// Staff de puerta
// ---------------------------------------------------------------------------

export async function addEventStaff(eventId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { supabase } = await requireUser();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Escribe un correo válido" };

    const { error } = await supabase.from("event_staff").insert({ event_id: eventId, email });
    if (error) {
      return { error: error.code === "23505" ? "Ese correo ya está en el staff" : error.message };
    }

    revalidatePath(`/dashboard/events/${eventId}/edit`);
    return { ok: true, message: `${email} ya puede validar entradas` };
  } catch (err) {
    return fail(err);
  }
}

export async function removeEventStaff(eventId: string, staffId: string, _prev: ActionState): Promise<ActionState> {
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.from("event_staff").delete().eq("id", staffId).eq("event_id", eventId);
    if (error) return { error: error.message };
    revalidatePath(`/dashboard/events/${eventId}/edit`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ---------------------------------------------------------------------------
// Cortesías
// ---------------------------------------------------------------------------

/** Emite N entradas gratis a nombre de una persona; descuentan del cupo y le llegan por correo. */
export async function issueCourtesy(eventId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { supabase, user } = await requireUser();

    const ticketTypeId = String(formData.get("ticket_type_id") ?? "");
    const quantity = Number(formData.get("quantity"));
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();

    if (!ticketTypeId) return { error: "Elige el tipo de entrada" };
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) return { error: "La cantidad debe estar entre 1 y 20" };
    if (!name) return { error: "Escribe el nombre de quien recibe las entradas" };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Escribe un correo válido" };

    // El evento tiene que ser del productor (RLS lo garantiza en la lectura).
    const { data: event } = await supabase.from("events").select("id").eq("id", eventId).single();
    if (!event) return { error: "Evento no encontrado" };

    const admin = createAdminClient();
    const quote = await buildQuote(admin, {
      eventId,
      items: [{ ticketTypeId, quantity }],
      requirePublished: false,
      skipSalesWindow: true,
    });

    // Si la persona ya tiene cuenta, la cortesía queda en su "Mis entradas".
    const { data: recipient } = await admin.from("profiles").select("id").ilike("email", email).maybeSingle();

    const args = orderRpcArgs(quote, { id: recipient?.id ?? user.id, email }, "courtesy", { holderName: name });
    args.p_items = args.p_items.map((i) => ({ ...i, unit_base_price: 0, unit_discount: 0 }));
    args.p_discount_code_id = null;
    args.p_ambassador_id = null;
    args.p_amounts = { total: 0, service_fee: 0, mp_fee: 0, anc_fee: 0, discount: 0 };

    const { data: orderId, error: rpcError } = await admin.rpc("create_pending_order", args);
    if (rpcError || !orderId) {
      const friendly = rpcError ? friendlyRpcError(rpcError.message, quote.ticketTypes) : null;
      return { error: friendly?.message ?? "No se pudo crear la cortesía" };
    }

    const { error: approveError } = await admin.rpc("approve_order", { p_order_id: orderId, p_payment_id: null });
    if (approveError) {
      await admin.rpc("fail_order", { p_order_id: orderId, p_new_status: "cancelled" });
      return { error: "No se pudo emitir la cortesía" };
    }

    const sent = await deliverOrderEmail(admin, orderId);
    revalidatePath(`/dashboard/events/${eventId}/edit`);
    return {
      ok: true,
      message: sent
        ? `Enviamos ${quantity} ${quantity === 1 ? "entrada" : "entradas"} a ${email}`
        : `Emitimos las entradas pero el correo falló. Puedes reenviarlo desde "Mis entradas" de ${email}.`,
    };
  } catch (err) {
    if (err instanceof CheckoutError) return { error: err.message };
    return fail(err);
  }
}
