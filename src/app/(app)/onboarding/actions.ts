"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setOrganizerName(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/onboarding");

  const organizerName = String(formData.get("organizer_name") ?? "").trim();
  if (!organizerName) {
    throw new Error("El nombre de tu productora es obligatorio");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ organizer_name: organizerName })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/events");
}
