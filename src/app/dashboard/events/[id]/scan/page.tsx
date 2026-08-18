import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Event } from "@/lib/database.types";
import ScannerClient from "./scanner-client";

export default async function ScanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single<Event>();

  if (!event || event.organizer_id !== user.id) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-1 text-2xl font-bold text-neutral-900">
        Validar entradas
      </h1>
      <p className="mb-6 text-sm text-neutral-500">{event.title}</p>
      <ScannerClient />
    </div>
  );
}
