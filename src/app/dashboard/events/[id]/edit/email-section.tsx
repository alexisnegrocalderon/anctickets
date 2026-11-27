"use client";

/**
 * Pestaña "Correo": la productora edita los textos del correo que reciben sus
 * compradores. Solo texto (nada de HTML). La vista previa es el HTML real del
 * correo generado en el servidor, dentro de un iframe con sandbox sin scripts.
 */
import { useRef, useState, useTransition } from "react";
import { Button, Card } from "@/components/dashboard/ui";
import Sheet from "@/components/dashboard/sheet";
import { CountedTextarea, TextField } from "@/components/dashboard/counted-field";
import { PauseSwitch } from "@/components/dashboard/tier-fields";
import { forcePreviewScheme, type PreviewScheme } from "@/lib/email/preview";
import type { EmailFieldErrors } from "@/lib/email/form";
import { previewEmail, saveEmailSettings, sendTestEmail, type EmailActionState } from "../../email-actions";

export interface EmailSettingsInitial {
  welcome: string;
  access: string;
  rules: string;
  directions: string;
  contactEmail: string;
  instagram: string;
  whatsapp: string;
  useEventImage: boolean;
}

function SegButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-11 flex-1 rounded-full px-4 text-sm font-semibold transition ${
        active ? "bg-white text-[#0b0b0b]" : "text-neutral-300 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 border-t border-white/10 pt-5 first:border-t-0 first:pt-0">
      <legend className="sr-only">{title}</legend>
      <div>
        <h3 className="text-xl uppercase text-white" aria-hidden="true">
          {title}
        </h3>
        {hint ? <p className="mt-1 text-sm text-neutral-400">{hint}</p> : null}
      </div>
      {children}
    </fieldset>
  );
}

export default function EmailSection({
  eventId,
  initial,
  sessionEmail,
}: {
  eventId: string;
  initial: EmailSettingsInitial;
  sessionEmail: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [useImage, setUseImage] = useState(initial.useEventImage);
  const [fieldErrors, setFieldErrors] = useState<EmailFieldErrors>({});
  const [status, setStatus] = useState<EmailActionState>(null);
  const [saving, startSave] = useTransition();
  const [testing, startTest] = useTransition();
  const [previewing, startPreview] = useTransition();

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [scheme, setScheme] = useState<PreviewScheme>("light");
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");

  function snapshot() {
    return new FormData(formRef.current!);
  }

  function report(res: EmailActionState) {
    setStatus(res);
    setFieldErrors(res?.fieldErrors ?? {});
  }

  function onSave() {
    startSave(async () => report(await saveEmailSettings(eventId, null, snapshot())));
  }

  function onTest() {
    startTest(async () => report(await sendTestEmail(eventId, snapshot())));
  }

  function onPreview() {
    setPreviewError(null);
    startPreview(async () => {
      const res = await previewEmail(eventId, snapshot());
      if (res.html) {
        setPreviewHtml(res.html);
        setPreviewOpen(true);
        setFieldErrors({});
      } else {
        setFieldErrors(res.fieldErrors ?? {});
        setStatus({ error: res.error ?? "No pudimos armar la vista previa." });
      }
    });
  }

  const e = fieldErrors;
  return (
    <Card className="mb-6">
      <h2 className="text-2xl uppercase text-white">Correo para tus compradores</h2>
      <p className="mt-1 mb-5 text-sm text-neutral-400">
        Cada comprador recibe sus entradas con tu logo y tus colores. Aquí eliges los textos. Solo texto: no se
        permite HTML ni enlaces sueltos.
      </p>

      <form
        ref={formRef}
        className="flex flex-col gap-6"
        onSubmit={(ev) => {
          ev.preventDefault();
          onSave();
        }}
      >
        <Group title="Portada" hint="La imagen del evento se muestra arriba del correo.">
          <PauseSwitch name="email_use_event_image" checked={useImage} onChange={setUseImage} label="Usar la imagen del evento" />
        </Group>

        <Group title="Bienvenida" hint="Lo primero que lee tu comprador, después del saludo.">
          <CountedTextarea
            name="email_welcome"
            label="Mensaje de bienvenida"
            max={280}
            rows={3}
            defaultValue={initial.welcome}
            error={e.email_welcome}
            help="Usa {nombre} para saludar al titular. Si no hay nombre, se omite."
            example="¡Hola {nombre}! Gracias por venir, nos vemos en la pista."
          />
        </Group>

        <Group title="Acceso" hint="Lo que necesitan saber para entrar sin demoras.">
          <CountedTextarea
            name="email_access"
            label="Información de acceso"
            max={600}
            rows={4}
            defaultValue={initial.access}
            error={e.email_access}
            help="Hora de apertura de puertas, hora límite, por qué puerta y si piden cédula."
            example={"Puertas desde las 22:00, ingreso hasta la 01:00.\nEntrada por la puerta norte. Lleva tu cédula."}
          />
        </Group>

        <Group title="Reglas" hint="Edad mínima y qué llevar o no llevar.">
          <CountedTextarea
            name="email_rules"
            label="Reglas del evento"
            max={600}
            rows={4}
            defaultValue={initial.rules}
            error={e.email_rules}
            help="Edad mínima, qué llevar y qué no."
            example="Mayores de 18 años. No se permite el ingreso de mochilas ni bebidas."
          />
        </Group>

        <Group title="Cómo llegar" hint='El botón "Abrir en Maps" se arma solo con el lugar del evento.'>
          <CountedTextarea
            name="email_directions"
            label="Indicaciones"
            max={400}
            rows={3}
            defaultValue={initial.directions}
            error={e.email_directions}
            help="Indicaciones, estacionamiento y transporte."
            example="Metro Quinta Normal, salida Matucana. Estacionamiento pagado en calle Mapocho."
          />
        </Group>

        <Group title="Contacto" hint="Tus compradores podrán escribirte. El correo de contacto recibe las respuestas.">
          <TextField
            name="contact_email"
            label="Correo de contacto"
            type="email"
            inputMode="email"
            autoComplete="off"
            maxLength={254}
            defaultValue={initial.contactEmail}
            error={e.contact_email}
            help="Cuando alguien responde el correo, te llega a ti."
            example="hola@tuproductora.cl"
          />
          <TextField
            name="contact_instagram"
            label="Instagram"
            maxLength={60}
            autoComplete="off"
            defaultValue={initial.instagram ? `@${initial.instagram}` : ""}
            error={e.contact_instagram}
            help="Tu usuario. También sirve pegar el enlace de tu perfil."
            example="@tuproductora"
          />
          <TextField
            name="contact_whatsapp"
            label="WhatsApp"
            type="tel"
            inputMode="tel"
            maxLength={30}
            autoComplete="off"
            defaultValue={initial.whatsapp}
            error={e.contact_whatsapp}
            help="Con código de país, solo dígitos."
            example="+56912345678"
          />
        </Group>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-5">
          <Button type="submit" variant="primary" disabled={saving} className="w-full sm:w-auto sm:self-start">
            {saving ? "Guardando…" : "Guardar correo"}
          </Button>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" onClick={onPreview} disabled={previewing} className="w-full sm:w-auto">
              {previewing ? "Preparando…" : "Vista previa"}
            </Button>
            <Button type="button" onClick={onTest} disabled={testing || !sessionEmail} className="w-full sm:w-auto">
              {testing ? "Enviando…" : "Enviarme un correo de prueba"}
            </Button>
          </div>
          <p className="text-xs text-neutral-500">
            La prueba llega solo a {sessionEmail ?? "tu correo de sesión"} (una por minuto). La vista previa y la prueba usan
            lo que ves en el formulario, aunque aún no lo hayas guardado.
          </p>
          <div aria-live="polite">
            {status?.error ? (
              <p role="alert" className="text-sm text-red-400">
                {status.error}
              </p>
            ) : status?.ok ? (
              <p role="status" className="text-sm text-emerald-400">
                {status.message}
              </p>
            ) : null}
          </div>
        </div>
      </form>

      <Sheet open={previewOpen} onClose={() => setPreviewOpen(false)} title="Vista previa" wide>
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="flex flex-1 rounded-full border border-white/15 p-0.5" role="group" aria-label="Modo de color">
              <SegButton active={scheme === "light"} onClick={() => setScheme("light")}>
                Claro
              </SegButton>
              <SegButton active={scheme === "dark"} onClick={() => setScheme("dark")}>
                Oscuro
              </SegButton>
            </div>
            <div className="flex flex-1 rounded-full border border-white/15 p-0.5" role="group" aria-label="Tamaño de pantalla">
              <SegButton active={device === "mobile"} onClick={() => setDevice("mobile")}>
                Móvil
              </SegButton>
              <SegButton active={device === "desktop"} onClick={() => setDevice("desktop")}>
                Escritorio
              </SegButton>
            </div>
          </div>
          {previewError ? (
            <p role="alert" className="text-sm text-red-400">
              {previewError}
            </p>
          ) : null}
          <div className="flex justify-center rounded-2xl border border-white/10 bg-black/40 p-2">
            {previewHtml ? (
              <iframe
                title="Vista previa del correo"
                sandbox=""
                referrerPolicy="no-referrer"
                srcDoc={forcePreviewScheme(previewHtml, scheme)}
                className="h-[58dvh] rounded-xl border-0 bg-white"
                style={{ width: device === "mobile" ? "min(100%, 375px)" : "100%" }}
              />
            ) : null}
          </div>
          <p className="text-xs text-neutral-500">
            Los códigos QR de la vista previa son de ejemplo. Los enlaces no se abren desde aquí.
          </p>
        </div>
      </Sheet>
    </Card>
  );
}
