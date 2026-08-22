import { redirect } from "next/navigation";

/** La creación heredada queda reemplazada por el creador inmersivo dentro de una organización. */
export default function NewEventPage() {
  redirect("/dashboard");
}
