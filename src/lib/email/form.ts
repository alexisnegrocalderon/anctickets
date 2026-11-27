/**
 * Lectura y validación (servidor) de los campos de correo que escribe la
 * productora. Devuelve valores ya saneados y errores en español por campo.
 * Pura: la usan las server actions y los tests.
 */
import {
  EMAIL_LIMITS,
  normalizeInstagram,
  normalizeWhatsapp,
  sanitizeText,
  textLength,
  validateContactEmail,
} from "./sanitize";

export type EmailFieldName =
  | "email_welcome"
  | "email_access"
  | "email_rules"
  | "email_directions"
  | "contact_email"
  | "contact_instagram"
  | "contact_whatsapp";

export interface EmailSettingsValues {
  email_welcome: string | null;
  email_access: string | null;
  email_rules: string | null;
  email_directions: string | null;
  contact_email: string | null;
  contact_instagram: string | null;
  contact_whatsapp: string | null;
  email_use_event_image: boolean;
}

export type EmailFieldErrors = Partial<Record<EmailFieldName | "email_note", string>>;

const TEXT_FIELDS: { name: EmailFieldName; max: number; label: string }[] = [
  { name: "email_welcome", max: EMAIL_LIMITS.welcome, label: "El mensaje de bienvenida" },
  { name: "email_access", max: EMAIL_LIMITS.access, label: "La información de acceso" },
  { name: "email_rules", max: EMAIL_LIMITS.rules, label: "Las reglas del evento" },
  { name: "email_directions", max: EMAIL_LIMITS.directions, label: "Las indicaciones" },
];

function read(formData: FormData, name: string): string {
  const v = formData.get(name);
  return typeof v === "string" ? v : "";
}

/** Texto libre de largo acotado: error si se pasa (no se corta en silencio). */
export function cleanLimitedText(raw: string, max: number, label: string): { value: string | null; error?: string } {
  const cleaned = sanitizeText(raw, 100_000);
  if (textLength(cleaned) > max) return { value: null, error: `${label} puede tener hasta ${max} caracteres (llevas ${textLength(cleaned)}).` };
  return { value: cleaned || null };
}

export function parseEmailSettings(formData: FormData): { values: EmailSettingsValues; errors: EmailFieldErrors } {
  const errors: EmailFieldErrors = {};
  const values: EmailSettingsValues = {
    email_welcome: null,
    email_access: null,
    email_rules: null,
    email_directions: null,
    contact_email: null,
    contact_instagram: null,
    contact_whatsapp: null,
    email_use_event_image: read(formData, "email_use_event_image") === "on" || read(formData, "email_use_event_image") === "true",
  };

  for (const f of TEXT_FIELDS) {
    const res = cleanLimitedText(read(formData, f.name), f.max, f.label);
    if (res.error) errors[f.name] = res.error;
    else values[f.name] = res.value;
  }

  const email = read(formData, "contact_email").trim();
  if (email) {
    const ok = validateContactEmail(email);
    if (!ok) errors.contact_email = "Escribe un correo válido, por ejemplo hola@tuproductora.cl.";
    else values.contact_email = ok;
  }

  const ig = read(formData, "contact_instagram").trim();
  if (ig) {
    const ok = normalizeInstagram(ig);
    if (!ok) errors.contact_instagram = "Escribe solo tu usuario de Instagram, por ejemplo @tuproductora.";
    else values.contact_instagram = ok;
  }

  const wa = read(formData, "contact_whatsapp").trim();
  if (wa) {
    const ok = normalizeWhatsapp(wa);
    if (!ok) errors.contact_whatsapp = "Escribe el número con código de país, solo dígitos, por ejemplo +56912345678.";
    else values.contact_whatsapp = ok;
  }

  return { values, errors };
}

/** Nota por tipo de entrada (<= 300). */
export function parseTicketNote(formData: FormData): { value: string | null; error?: string } {
  return cleanLimitedText(read(formData, "email_note"), EMAIL_LIMITS.ticketNote, "El mensaje de esta entrada");
}
