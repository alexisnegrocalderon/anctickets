"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { onboardingNext } from "@/lib/safe-redirect";
import { bumpEntryMetric } from "@/lib/entry-metrics-server";

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

  // Solo cuenta como alta la primera vez que se pone el nombre.
  const { data: before } = await supabase
    .from("profiles")
    .select("organizer_name")
    .eq("id", user.id)
    .single();

  const { error } = await supabase
    .from("profiles")
    .update({ organizer_name: organizerName })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  if (!before?.organizer_name) await bumpEntryMetric("alta_productora");

  revalidatePath("/dashboard", "layout");
  redirect(onboardingNext(String(formData.get("next") ?? "")));
}
