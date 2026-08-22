import { redirect } from "next/navigation";

/** La administración heredada queda fuera del recorrido de clientes; el panel canónico es por organización. */
export default function DashboardEventsPage() {
  redirect("/dashboard");
}
