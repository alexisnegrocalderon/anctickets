"use client";

import { authClient } from "@/lib/auth-client";

export default function SignOutButton() {
  async function signOut() {
    await authClient.signOut();
    window.location.assign("/");
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="rounded-full border border-neutral-300 px-4 py-1.5 text-neutral-700 hover:bg-neutral-50"
    >
      Cerrar sesión
    </button>
  );
}
