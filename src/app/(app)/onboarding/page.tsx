import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button, Field, Input } from "@/components/dashboard/ui";
import { setOrganizerName } from "./actions";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/onboarding");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organizer_name")
    .eq("id", user.id)
    .single();

  if (profile?.organizer_name) redirect("/dashboard/events");

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-8 px-4">
      <div>
        <p className="font-mono text-xs font-bold uppercase tracking-[.2em] text-[#a77fff]">
          Último paso
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-[#f5f4f1] sm:text-4xl">
          ¿Cómo se llama tu productora?
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-400">
          Este nombre queda arriba de tu panel y en la página de cada evento que
          crees, para que tu público sepa quién presenta la fecha.
        </p>
      </div>

      <form action={setOrganizerName} className="flex flex-col gap-4">
        <Field label="Nombre de tu productora">
          <Input
            name="organizer_name"
            required
            autoFocus
            placeholder="Ej. ANC Producciones"
          />
        </Field>
        <Button type="submit" variant="primary" className="self-start px-6 py-3">
          Continuar →
        </Button>
      </form>
    </div>
  );
}
