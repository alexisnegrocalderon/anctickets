"use client";

import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function MagicLinkForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "sent" | "error">("idle");

  async function requestMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    const { error } = await authClient.signIn.magicLink({
      email,
      callbackURL: "/dashboard/tickets",
    });
    setState(error ? "error" : "sent");
  }

  return (
    <form className="flex w-full flex-col gap-3" onSubmit={requestMagicLink}>
      <label className="text-left text-xs font-medium text-neutral-600" htmlFor="email">
        Acceso por correo
      </label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="tu@email.com"
        className="w-full rounded-full border border-neutral-300 bg-white px-4 py-3 text-sm outline-none ring-0 transition placeholder:text-neutral-400 focus:border-neutral-800"
      />
      <button
        type="submit"
        disabled={state === "loading" || state === "sent"}
        className="rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state === "loading" ? "Enviando enlace..." : state === "sent" ? "Revisa tu correo" : "Enviar Magic Link"}
      </button>
      {state === "sent" && <p className="text-xs text-emerald-700">Si el correo existe, recibirás un enlace de acceso en unos minutos.</p>}
      {state === "error" && <p className="text-xs text-red-700">No fue posible enviar el enlace. Inténtalo nuevamente.</p>}
    </form>
  );
}
