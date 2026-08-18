"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function createEvent(formData: FormData) {
  const { supabase, user } = await requireUser();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const venue = String(formData.get("venue") ?? "").trim();
  const eventDate = String(formData.get("event_date") ?? "");
  const imageUrl = String(formData.get("image_url") ?? "").trim();

  if (!title || !eventDate) {
    throw new Error("Título y fecha son obligatorios");
  }

  const { data, error } = await supabase
    .from("events")
    .insert({
      organizer_id: user.id,
      title,
      description: description || null,
      venue: venue || null,
      event_date: new Date(eventDate).toISOString(),
      image_url: imageUrl || null,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo crear el evento");
  }

  revalidatePath("/dashboard/events");
  redirect(`/dashboard/events/${data.id}/edit`);
}

export async function updateEvent(eventId: string, formData: FormData) {
  const { supabase } = await requireUser();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const venue = String(formData.get("venue") ?? "").trim();
  const eventDate = String(formData.get("event_date") ?? "");
  const imageUrl = String(formData.get("image_url") ?? "").trim();

  const { error } = await supabase
    .from("events")
    .update({
      title,
      description: description || null,
      venue: venue || null,
      event_date: new Date(eventDate).toISOString(),
      image_url: imageUrl || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/events/${eventId}/edit`);
  revalidatePath("/dashboard/events");
  revalidatePath("/");
}

export async function setEventStatus(
  eventId: string,
  status: "draft" | "published" | "cancelled"
) {
  const { supabase } = await requireUser();

  const { error } = await supabase
    .from("events")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", eventId);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/events/${eventId}/edit`);
  revalidatePath("/dashboard/events");
  revalidatePath("/");
}

export async function deleteEvent(eventId: string) {
  const { supabase } = await requireUser();

  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/events");
  redirect("/dashboard/events");
}

export async function createTicketType(eventId: string, formData: FormData) {
  const { supabase } = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const basePrice = Number(formData.get("base_price"));
  const quantity = Number(formData.get("quantity"));

  if (!name || !Number.isFinite(basePrice) || basePrice < 0) {
    throw new Error("Datos de la entrada inválidos");
  }
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new Error("Cupo inválido");
  }

  const { error } = await supabase.from("ticket_types").insert({
    event_id: eventId,
    name,
    base_price: basePrice,
    quantity,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/events/${eventId}/edit`);
}

export async function updateTicketType(
  eventId: string,
  ticketTypeId: string,
  formData: FormData
) {
  const { supabase } = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const basePrice = Number(formData.get("base_price"));
  const quantity = Number(formData.get("quantity"));

  const { error } = await supabase
    .from("ticket_types")
    .update({
      name,
      base_price: basePrice,
      quantity,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketTypeId);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/events/${eventId}/edit`);
}

export async function deleteTicketType(eventId: string, ticketTypeId: string) {
  const { supabase } = await requireUser();

  const { error } = await supabase
    .from("ticket_types")
    .delete()
    .eq("id", ticketTypeId);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/events/${eventId}/edit`);
}
