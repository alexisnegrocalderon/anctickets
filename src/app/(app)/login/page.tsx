import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GoogleSignInButton from "./google-sign-in-button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(next ?? "/dashboard/events");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center gap-6 px-4 text-center">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ANC Tickets</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Inicia sesión para comprar entradas o crear tus propios eventos.
        </p>
      </div>
      <GoogleSignInButton next={next} />
    </div>
  );
}
