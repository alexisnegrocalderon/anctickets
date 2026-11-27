"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { Button, Field, Input } from "@/components/dashboard/ui";
import { signInTeam, verifyTeamCode } from "./actions";

function ErrorLine({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300">
      {message}
    </p>
  );
}

export function TeamLoginForm({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    setError(null);
    startTransition(async () => {
      const result = await signInTeam(email, password, next);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 text-left">
      <Field label="Correo">
        <Input type="email" name="email" autoComplete="username" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} required maxLength={254} />
      </Field>
      <Field label="Clave">
        <Input type="password" name="password" autoComplete="current-password" required maxLength={200} />
      </Field>
      <ErrorLine message={error} />
      <Button type="submit" variant="primary" disabled={pending} className="w-full">
        {pending ? "Entrando…" : "Entrar"}
      </Button>
      <Link href="/login" className="mx-auto inline-flex min-h-11 items-center px-3 text-sm text-[var(--anc-muted-text)] underline-offset-4 hover:text-white hover:underline">
        Volver
      </Link>
    </form>
  );
}

export function TeamVerifyForm({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const code = String(form.get("code") ?? "");
    setError(null);
    startTransition(async () => {
      const result = await verifyTeamCode(code, next);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4 text-left">
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="Código de 6 dígitos">
        <Input
          type="text"
          name="code"
          autoComplete="one-time-code"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          required
          autoFocus
          className="text-center font-mono text-2xl tracking-[.4em]"
        />
      </Field>
      <ErrorLine message={error} />
      <Button type="submit" variant="primary" disabled={pending} className="w-full">
        {pending ? "Verificando…" : "Verificar"}
      </Button>
    </form>
      <form action="/auth/signout" method="post" className="flex justify-center">
        <button type="submit" className="inline-flex min-h-11 items-center px-3 text-sm text-[var(--anc-muted-text)] underline-offset-4 hover:text-white hover:underline">
          Cancelar
        </button>
      </form>
    </div>
  );
}
