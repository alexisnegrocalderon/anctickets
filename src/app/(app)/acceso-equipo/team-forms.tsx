"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { Button, Field, Input } from "@/components/dashboard/ui";
import { signInTeam } from "./actions";

export function TeamLoginForm({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const code = String(form.get("code") ?? "");
    setError(null);
    startTransition(async () => {
      const result = await signInTeam(email, password, code, next);
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
      <Field label="Código de 6 dígitos">
        <Input
          type="text"
          name="code"
          autoComplete="one-time-code"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          required
          className="text-center font-mono text-xl tracking-[.3em]"
        />
      </Field>
      {error ? (
        <p role="alert" className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}
      <Button type="submit" variant="primary" disabled={pending} className="w-full">
        {pending ? "Entrando…" : "Entrar"}
      </Button>
      <Link href="/login" className="mx-auto inline-flex min-h-11 items-center px-3 text-sm text-[var(--anc-muted-text)] underline-offset-4 hover:text-white hover:underline">
        Volver
      </Link>
    </form>
  );
}
