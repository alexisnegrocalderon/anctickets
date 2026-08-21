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
      <label className="text-left text-xs font-medium text-neutral-300" htmlFor="email">
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
        className="w-full rounded-xl border border-white/20 bg-white/[.08] px-4 py-3 text-sm text-white outline-none ring-0 transition placeholder:text-neutral-500 focus:border-[#a77fff]"
      />
      <button
        type="submit"
        disabled={state === "loading" || state === "sent"}
        className="rounded-xl bg-[#a77fff] px-6 py-3 text-sm font-black text-black transition hover:bg-[#c6b0ff] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state === "loading" ? "Enviando enlace..." : state === "sent" ? "Revisa tu correo" : "Enviar Magic Link"}
      </button>
      {state === "sent" && <p className="text-xs text-emerald-300">Si el correo existe, recibirás un enlace de acceso en unos minutos.</p>}
      {state === "error" && <p className="text-xs text-red-300">No fue posible enviar el enlace. Inténtalo nuevamente.</p>}
    </form>
  );
}
