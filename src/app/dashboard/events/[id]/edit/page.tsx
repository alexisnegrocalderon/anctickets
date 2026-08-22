import { redirect } from "next/navigation";

/** La edición heredada queda fuera del recorrido de clientes para evitar cambios fuera del modelo Neon. */
export default async function LegacyEventEditPage() {
  redirect("/dashboard");
}
