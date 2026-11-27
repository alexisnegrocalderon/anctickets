"use client";

/**
 * Sección "Acceso con clave y 2 pasos" de Cuenta (solo administradores; el
 * servidor decide si se renderiza). Usa el cliente de navegador de Supabase.
 * NUNCA se registra ni se muestra la clave en consola.
 */
import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge, Button, Card, Field, Input } from "@/components/dashboard/ui";
import Sheet from "@/components/dashboard/sheet";
import CopyTextButton from "@/components/dashboard/copy-text-button";
import { PASSWORD_MAX, passwordStrength, validateNewPassword } from "@/lib/team-password";
import { resetTeamMfa } from "@/app/dashboard/account/actions";

type Props = {
  email: string;
  hasTotp: boolean;
  hasPassword: boolean;
  viaGoogle: boolean;
  accessUrl: string;
};

const sub = "rounded-xl border border-white/10 p-4";
const h3 = "text-base font-semibold text-white";
const muted = "mt-1 text-sm text-[var(--anc-muted-text)]";

export default function TeamAccessSection({ email, hasTotp, hasPassword, viaGoogle, accessUrl }: Props) {
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [open, setOpen] = useState<"password" | "enroll" | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  return (
    <Card>
      <h2 className="text-2xl uppercase text-white">Acceso con clave y 2 pasos</h2>
      <p className={muted}>
        Una forma alternativa de entrar a la administración sin Google. La clave sola nunca abre el panel: siempre
        pide además el código de 6 dígitos.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge tone={hasPassword || passwordSaved ? "success" : "neutral"}>
          {hasPassword || passwordSaved ? "Clave guardada" : "Sin clave aún"}
        </Badge>
        <Badge tone={hasTotp ? "success" : "neutral"}>{hasTotp ? "2 pasos: Activa" : "2 pasos: sin activar"}</Badge>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <div className={sub}>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[.18em] text-[var(--anc-muted-text)]">
            Tu acceso con clave
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="min-w-0 break-all text-sm text-white">{accessUrl.replace(/^https?:\/\//, "")}</p>
            <CopyTextButton text={accessUrl} />
          </div>
          <p className="mt-2 text-xs text-[var(--anc-muted-text)]">Guárdala en favoritos: no tiene enlace público.</p>
        </div>

        <div className={sub}>
          <h3 className={h3}>Crear o cambiar mi clave</h3>
          <p className={muted}>Mínimo 12 caracteres. Una frase larga es mejor que una clave rara.</p>
          {open === "password" ? (
            <PasswordForm
              email={email}
              onDone={() => {
                setPasswordSaved(true);
                setOpen(null);
              }}
              onCancel={() => setOpen(null)}
            />
          ) : (
            <Button className="mt-3 w-full sm:w-auto" onClick={() => setOpen("password")}>
              {hasPassword || passwordSaved ? "Cambiar mi clave" : "Crear mi clave"}
            </Button>
          )}
        </div>

        <div className={sub}>
          <h3 className={h3}>Verificación en 2 pasos</h3>
          {hasTotp ? (
            <p className={muted}>Activa. Para cambiar de teléfono, restablécela y vuelve a activarla.</p>
          ) : (
            <p className={muted}>Sin ella, entrar con clave no está permitido.</p>
          )}
          {!hasTotp && open === "enroll" ? (
            <EnrollFlow onCancel={() => setOpen(null)} />
          ) : !hasTotp ? (
            <Button className="mt-3 w-full sm:w-auto" onClick={() => setOpen("enroll")}>
              Activar verificación en 2 pasos
            </Button>
          ) : null}
        </div>

        <div className={sub}>
          <h3 className={h3}>Restablecer verificación en 2 pasos</h3>
          <p className={muted}>
            Si perdiste el teléfono. Solo funciona entrando con Google y cierra tus otras sesiones.
          </p>
          <Button variant="danger" className="mt-3 w-full sm:w-auto" onClick={() => setResetOpen(true)}>
            Restablecer…
          </Button>
        </div>
      </div>

      <Sheet open={resetOpen} onClose={() => setResetOpen(false)} title="Restablecer 2 pasos">
        <ResetSheetBody viaGoogle={viaGoogle} hasTotp={hasTotp} onClose={() => setResetOpen(false)} />
      </Sheet>
    </Card>
  );
}

function PasswordForm({ email, onDone, onCancel }: { email: string; onDone: () => void; onCancel: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [pending, startTransition] = useTransition();
  const strength = passwordStrength(password);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNeedsReauth(false);
    const problem = validateNewPassword(password, confirm, email);
    if (problem) {
      setError(problem);
      return;
    }
    startTransition(async () => {
      const { error: updateError } = await createClient().auth.updateUser({ password });
      if (!updateError) {
        setPassword("");
        setConfirm("");
        onDone();
        return;
      }
      const code = (updateError as { code?: string }).code ?? "";
      const text = `${code} ${updateError.message}`.toLowerCase();
      if (text.includes("reauth") || text.includes("session") || text.includes("recent")) {
        setNeedsReauth(true);
      } else if (code === "same_password") {
        setError("La nueva clave debe ser distinta a la actual.");
      } else if (code === "weak_password") {
        setError("El sistema rechazó esa clave por ser fácil de adivinar. Prueba con una frase más larga.");
      } else {
        setError("No se pudo guardar la clave. Inténtalo de nuevo.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-3">
      <Field label="Correo">
        <Input type="email" value={email} readOnly autoComplete="username" tabIndex={-1} className="opacity-70" />
      </Field>
      <Field label="Clave nueva">
        <Input
          type="password"
          name="new-password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          maxLength={PASSWORD_MAX}
          required
        />
      </Field>
      {password ? (
        <div aria-live="polite">
          <div className="flex gap-1.5" aria-hidden="true">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={`h-1.5 flex-1 rounded-full ${
                  strength.score >= n
                    ? strength.score === 1
                      ? "bg-amber-400"
                      : "bg-emerald-400"
                    : "bg-white/10"
                }`}
              />
            ))}
          </div>
          <p className="mt-1 text-xs text-[var(--anc-muted-text)]">Fortaleza: {strength.label}</p>
        </div>
      ) : null}
      <Field label="Repite la clave">
        <Input
          type="password"
          name="confirm-password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          maxLength={PASSWORD_MAX}
          required
        />
      </Field>
      {error ? (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}
      {needsReauth ? (
        <p role="alert" className="rounded-lg bg-amber-500/10 px-3 py-3 text-sm text-amber-200">
          Por seguridad, cambiar la clave pide haber iniciado sesión hace poco. Cierra sesión, vuelve a entrar con
          Google y reintenta.
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" variant="primary" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Guardando…" : "Guardar clave"}
        </Button>
        <Button onClick={onCancel} className="w-full sm:w-auto">
          Cancelar
        </Button>
      </div>
    </form>
  );
}

type Pending = { factorId: string; qr: string; secret: string };

function qrSrc(raw: string): string {
  // supabase-js antepone "data:image/svg+xml;utf-8," al SVG crudo sin codificarlo: un "#" del SVG
  // cortaría la URL. Se saca el prefijo y el SVG se vuelve a codificar entero.
  const body = raw.replace(/^data:image\/svg\+xml[^,]*,/, "");
  if (body.trimStart().startsWith("<")) return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(body)}`;
  return raw.startsWith("data:") ? raw : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(raw)}`;
}

function EnrollFlow({ onCancel }: { onCancel: () => void }) {
  const router = useRouter();
  const [pendingFactor, setPendingFactor] = useState<Pending | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, startTransition] = useTransition();

  function begin() {
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      // Limpia un enrolamiento anterior que quedó a medias (factor sin verificar).
      const { data: factors } = await supabase.auth.mfa.listFactors();
      for (const f of factors?.all ?? []) {
        if (f.factor_type === "totp" && f.status === "unverified") {
          await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
      }
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "ANC Tickets · Administración",
      });
      if (enrollError || !data) {
        setError("No se pudo iniciar la activación. Inténtalo de nuevo.");
        return;
      }
      setPendingFactor({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    });
  }

  function confirm(event: FormEvent) {
    event.preventDefault();
    if (!pendingFactor) return;
    setError(null);
    const clean = code.replace(/\s+/g, "");
    if (!/^\d{6}$/.test(clean)) {
      setError("Ingresa los 6 dígitos del código.");
      return;
    }
    startTransition(async () => {
      const { error: verifyError } = await createClient().auth.mfa.challengeAndVerify({
        factorId: pendingFactor.factorId,
        code: clean,
      });
      if (verifyError) {
        setError("Código incorrecto o vencido. Prueba con el siguiente.");
        return;
      }
      setDone(true);
      setPendingFactor(null);
      router.refresh();
    });
  }

  function cancel() {
    const factor = pendingFactor;
    setPendingFactor(null);
    if (factor) void createClient().auth.mfa.unenroll({ factorId: factor.factorId });
    onCancel();
  }

  if (done) {
    return (
      <p role="status" className="mt-3 text-sm text-emerald-400">
        Listo: la verificación en 2 pasos quedó activa.
      </p>
    );
  }

  if (!pendingFactor) {
    return (
      <div className="mt-3 flex flex-col gap-2">
        {error ? (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="primary" disabled={busy} onClick={begin} className="w-full sm:w-auto">
            {busy ? "Preparando…" : "Mostrar código QR"}
          </Button>
          <Button onClick={onCancel} className="w-full sm:w-auto">
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={confirm} className="mt-3 flex flex-col gap-3">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-[var(--anc-muted-text)]">
        <li>
          En el iPhone: Ajustes &gt; Contraseñas, abre tu acceso y toca &quot;Configurar código de verificación&quot;.
          O escanea el QR con Google Authenticator.
        </li>
        <li>Escribe aquí el código de 6 dígitos que aparece.</li>
      </ol>
      <div className="mx-auto w-full max-w-[220px] rounded-xl bg-white p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrSrc(pendingFactor.qr)} alt="Código QR para activar la verificación en 2 pasos" className="h-auto w-full" />
      </div>
      <div>
        <p className="text-xs text-[var(--anc-muted-text)]">¿No puedes escanear? Usa esta clave:</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
          <code className="min-w-0 break-all font-mono text-sm text-white">{pendingFactor.secret}</code>
          <CopyTextButton text={pendingFactor.secret} />
        </div>
      </div>
      <Field label="Código de 6 dígitos">
        <Input
          type="text"
          name="code"
          autoComplete="one-time-code"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          className="text-center font-mono text-xl tracking-[.3em]"
        />
      </Field>
      {error ? (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" variant="primary" disabled={busy} className="w-full sm:w-auto">
          {busy ? "Verificando…" : "Confirmar y activar"}
        </Button>
        <Button onClick={cancel} className="w-full sm:w-auto">
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function ResetSheetBody({ viaGoogle, hasTotp, onClose }: { viaGoogle: boolean; hasTotp: boolean; onClose: () => void }) {
  const router = useRouter();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await resetTeamMfa();
        if (result?.ok) {
          setMessage({ ok: true, text: result.message ?? "Listo." });
          router.refresh();
        } else {
          setMessage({ ok: false, text: result?.error ?? "No se pudo restablecer." });
        }
      } catch {
        setMessage({ ok: false, text: "No se pudo restablecer. Inténtalo de nuevo." });
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--anc-muted-text)]">
        Se elimina la verificación en 2 pasos de tu cuenta y se cierran tus otras sesiones. Mientras no la actives
        de nuevo, entrar con clave no abrirá el panel. Entrar con Google sigue igual.
      </p>
      {!viaGoogle ? (
        <p className="rounded-lg bg-amber-500/10 px-3 py-3 text-sm text-amber-200">
          Estás con clave y código. Por seguridad, restablecer solo se permite entrando con Google: cierra sesión y
          vuelve a entrar con Google.
        </p>
      ) : null}
      {!hasTotp && viaGoogle ? (
        <p className="text-sm text-[var(--anc-muted-text)]">Hoy no tienes 2 pasos activos; no hay nada que restablecer.</p>
      ) : null}
      {message ? (
        <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-emerald-400" : "text-red-400"}`}>
          {message.text}
        </p>
      ) : null}
      <div className="flex flex-col gap-2">
        <Button variant="danger" disabled={pending || !viaGoogle || message?.ok === true} onClick={run} className="w-full">
          {pending ? "Restableciendo…" : "Sí, restablecer"}
        </Button>
        <Button onClick={onClose} className="w-full">
          {message?.ok ? "Cerrar" : "Cancelar"}
        </Button>
      </div>
    </div>
  );
}
