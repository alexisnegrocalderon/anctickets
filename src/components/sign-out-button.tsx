"use client";

import { authClient } from "@/lib/auth-client";

/** Estilo ANC: control de sesión legible sobre la navegación oscura y translúcida. */
export default function SignOutButton() {
  async function signOut() {
    await authClient.signOut();
    window.location.assign("/");
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="rounded-lg border border-white/25 px-3 py-2 text-[10px] font-black tracking-[.06em] text-white transition hover:border-[#c3adff] hover:text-[#c3adff] sm:px-4 sm:text-xs"
    >
      Cerrar sesión
    </button>
  );
}
