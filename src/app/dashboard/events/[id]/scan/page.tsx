import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Event } from "@/lib/database.types";
import ScannerClient from "./scanner-client";
import { PageHeader } from "@/components/dashboard/ui";

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
      <PageHeader title="Validar entradas" subtitle={event.title} />
      <ScannerClient />
    </div>
  );
}
