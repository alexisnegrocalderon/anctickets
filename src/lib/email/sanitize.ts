/**
 * Saneamiento de TODO lo que una productora puede escribir y que termina en un
 * correo. Principio: solo texto. Nada de HTML, nada de enlaces libres; cada
 * enlace se arma aquí a partir de datos validados (usuario de Instagram,
 * dígitos de WhatsApp, lugar para Maps). Son funciones puras y sin efectos.
 */
import { escapeHtml } from "@/lib/html";

/** Largo máximo por campo (los mismos números van en los CHECK de la migración 0011). */
export const EMAIL_LIMITS = {
  welcome: 280,
  access: 600,
  rules: 600,
  directions: 400,
  ticketNote: 300,
  noticeMessage: 500,
  contactEmail: 254,
  instagram: 30,
  whatsappDigitsMin: 8,
  whatsappDigitsMax: 15,
  senderName: 60,
  subject: 120,
  firstName: 30,
} as const;

const INVISIBLE_TEST = /[\u00AD\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF\uFFF9-\uFFFB]/;
// Control (salvo \n y \t, que se tratan aparte), DEL y controles C1.
const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
// Marcas de dirección y caracteres invisibles: LRM/RLM/ALM, embeddings y
// overrides (LRE, RLE, PDF, LRO, RLO), aislantes (LRI, RLI, FSI, PDI), espacios
// de ancho cero, word joiner, BOM, soft hyphen, mongolian vowel separator.
const INVISIBLE_RE = /[­؜᠎​-‏‪-‮⁠-⁯﻿￹-￻]/g;

/**
 * Deja el texto listo para guardarse y mostrarse: sin caracteres de control ni
 * marcas de dirección, con saltos de línea normalizados (máximo una línea en
 * blanco seguida), recortado y truncado a `max` caracteres. NO escapa HTML:
 * eso se hace al renderizar (`textToHtml` / `escapeHtml`).
 */
export function sanitizeText(input: unknown, max: number, opts: { multiline?: boolean } = {}): string {
  if (typeof input !== "string") return "";
  const multiline = opts.multiline ?? true;
  let text = input
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u2028\u2029\u0085]/g, "\n")
    .replace(/\t/g, " ")
    .replace(CONTROL_RE, "")
    .replace(INVISIBLE_RE, "");
  if (multiline) {
    text = text
      .split("\n")
      .map((line) => line.replace(/^[ \u00A0]+/, "").replace(/[ \u00A0]+$/, ""))
      .join("\n")
      .replace(/\n{3,}/g, "\n\n");
  } else {
    text = text.replace(/\n+/g, " ").replace(/ {2,}/g, " ");
  }
  text = text.trim();
  // Por puntos de código: no corta un emoji (par sustituto) a la mitad.
  const chars = Array.from(text);
  if (chars.length > max) text = chars.slice(0, max).join("").trim();
  return text;
}

/** Largo en caracteres (puntos de código) de un texto ya saneado. */
export function textLength(text: string): number {
  return Array.from(text).length;
}

/** Texto -> HTML seguro: escapa todo y convierte los saltos de línea en <br>. */
export function textToHtml(text: string): string {
  return escapeHtml(text).replace(/\n/g, "<br>");
}

/** Primer nombre para saludar ("María José Pérez" -> "María"). null si no hay. */
export function firstNameOf(full: string | null | undefined): string | null {
  const clean = sanitizeText(full ?? "", 80, { multiline: false });
  const first = clean.split(" ")[0] ?? "";
  const trimmed = Array.from(first).slice(0, EMAIL_LIMITS.firstName).join("");
  return trimmed || null;
}

/**
 * Reemplaza {nombre} por el nombre del titular. Sin nombre se quita la marca y
 * se limpia la puntuación que quedó colgando ("Hola {nombre}, bienvenido" ->
 * "Hola, bienvenido").
 */
export function applyNamePlaceholder(text: string, name: string | null): string {
  if (name) return text.replace(/\{nombre\}/gi, name);
  return text
    .replace(/[ \t]*\{nombre\}/gi, "")
    .replace(/^[\s,;:!.]+/, "")
    .replace(/\n[ ,;:]+/g, "\n")
    .trim();
}

// ---------------------------------------------------------------------------
// Datos de contacto
// ---------------------------------------------------------------------------

const IG_RESERVED = new Set(["p", "reel", "reels", "stories", "explore", "accounts", "tv", "direct", "about", "web"]);

/**
 * Instagram: acepta "usuario", "@usuario" o la URL de instagram.com/usuario y
 * devuelve solo el usuario (^[A-Za-z0-9._]{1,30}$). null si está vacío o no es válido.
 */
export function normalizeInstagram(input: unknown): string | null {
  if (typeof input !== "string") return null;
  let value = input.trim();
  if (!value || /[\s\u0000-\u001F]/.test(value)) return null;
  const url = /^(?:https?:\/\/)?(?:www\.|m\.)?instagram\.com\/([^/?#]*)\/?(?:[?#].*)?$/i.exec(value);
  if (url) value = url[1];
  else if (/[/:?#\\]/.test(value)) return null;
  value = value.replace(/^@/, "");
  if (!/^[A-Za-z0-9._]{1,30}$/.test(value)) return null;
  if (!/[A-Za-z0-9_]/.test(value)) return null;
  if (IG_RESERVED.has(value.toLowerCase())) return null;
  return value;
}

export function buildInstagramUrl(username: string | null | undefined): string | null {
  const user = normalizeInstagram(username ?? "");
  return user ? `https://instagram.com/${user}` : null;
}

/**
 * WhatsApp: solo dígitos (8 a 15) con "+" opcional al inicio. Se toleran
 * espacios, guiones, puntos y paréntesis al escribir. Devuelve la forma guardada
 * ("+56912345678" o "56912345678") o null.
 */
export function normalizeWhatsapp(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const value = input.trim();
  if (!value) return null;
  if (!/^\+?[\d\s().-]+$/.test(value)) return null;
  const compact = value.replace(/[\s().-]/g, "");
  if (!/^\+?\d{8,15}$/.test(compact)) return null;
  return compact;
}

export function buildWhatsappUrl(stored: string | null | undefined): string | null {
  const compact = normalizeWhatsapp(stored ?? "");
  return compact ? `https://wa.me/${compact.replace("+", "")}` : null;
}

/**
 * Correo de contacto (será el reply_to). Formato estricto, <= 254, sin espacios,
 * saltos de línea, comillas, <>, comas ni punto y coma. Devuelve el correo en
 * minúsculas o null.
 */
export function validateContactEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const value = input.trim();
  if (!value || value.length > EMAIL_LIMITS.contactEmail) return null;
  if (/[\s\u0000-\u001F\u007F-\u009F<>"',;:\\()[\]]/.test(value)) return null;
  if (INVISIBLE_TEST.test(value)) return null;
  const m = /^([A-Za-z0-9](?:[A-Za-z0-9._%+-]{0,62}[A-Za-z0-9])?)@((?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24})$/.exec(value);
  if (!m) return null;
  if (m[1].includes("..")) return null;
  return value.toLowerCase();
}

/** Botón "Abrir en Maps": se arma solo desde el lugar del evento. */
export function buildMapsUrl(venue: string | null | undefined): string | null {
  const clean = sanitizeText(venue ?? "", 200, { multiline: false });
  if (!clean) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clean)}`;
}

// ---------------------------------------------------------------------------
// Imágenes
// ---------------------------------------------------------------------------

function hostOf(rawUrl: string | undefined): URL | null {
  if (!rawUrl) return null;
  try {
    return new URL(rawUrl);
  } catch {
    return null;
  }
}

/**
 * Solo https:// y solo del almacenamiento público de Supabase del proyecto o de
 * la ruta propia /api del sitio. Cualquier otra cosa devuelve null (no se muestra).
 */
export function safeImageUrl(
  raw: string | null | undefined,
  env: { supabaseUrl?: string; siteUrl?: string } = {}
): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value || value.length > 2048 || /[\s\u0000-\u001F\u007F-\u009F<>"'`\\]/.test(value)) return null;
  const url = hostOf(value);
  if (!url || url.protocol !== "https:" || url.username || url.password) return null;

  const supabase = hostOf(env.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (
    supabase &&
    supabase.protocol === "https:" &&
    url.host === supabase.host &&
    (url.pathname.startsWith("/storage/v1/object/public/") || url.pathname.startsWith("/storage/v1/render/image/public/"))
  ) {
    return url.href;
  }

  const site = hostOf(env.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL);
  if (site && site.protocol === "https:" && url.host === site.host && url.pathname.startsWith("/api/")) {
    return url.href;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Cabeceras
// ---------------------------------------------------------------------------

/** Quita de un nombre todo lo que podría romper o falsificar una cabecera. */
function headerSafe(text: string): string {
  return text
    .normalize("NFC")
    .replace(CONTROL_RE, " ")
    .replace(INVISIBLE_RE, "")
    .replace(/[\r\n\t\u2028\u2029]/g, " ")
    .replace(/["'`<>:;,@\\()[\]{}=]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const SENDER_SUFFIX = " vía ANC Tickets";

/** "<productora> vía ANC Tickets" sanitizado y de 60 caracteres como máximo. */
export function safeSenderName(producerName: string | null | undefined): string {
  const name = headerSafe(typeof producerName === "string" ? producerName : "");
  if (!name) return "ANC Tickets";
  const room = EMAIL_LIMITS.senderName - Array.from(SENDER_SUFFIX).length;
  const cut = Array.from(name).slice(0, room).join("").trim();
  return cut ? `${cut}${SENDER_SUFFIX}` : "ANC Tickets";
}

const DEFAULT_FROM_ADDRESS = "tickets@ancdigital.cl";

/**
 * La dirección real sale SIEMPRE de RESEND_FROM_EMAIL (que puede venir como
 * "Nombre <correo@dominio>" o solo el correo) o del valor por defecto.
 */
export function senderAddress(envValue: string | undefined = process.env.RESEND_FROM_EMAIL): string {
  const raw = (envValue ?? "").trim();
  const angled = /<([^<>]+)>\s*$/.exec(raw);
  const candidate = (angled ? angled[1] : raw).trim();
  return validateContactEmail(candidate) ?? DEFAULT_FROM_ADDRESS;
}

/** `from` a partir de un nombre ya armado ("X vía ANC Tickets"): se vuelve a sanear y se recorta a 60. */
export function fromHeaderForSender(senderName: string, envValue?: string): string {
  const name = Array.from(headerSafe(senderName)).slice(0, EMAIL_LIMITS.senderName).join("").trim() || "ANC Tickets";
  return `${name} <${senderAddress(envValue)}>`;
}

/** Valor de `from` para Resend: nombre sanitizado + dirección fija. */
export function buildFromHeader(producerName: string | null | undefined, envValue?: string): string {
  return `${safeSenderName(producerName)} <${senderAddress(envValue)}>`;
}

/** Asunto de una sola línea, armado solo con texto saneado. */
export function safeSubject(prefix: string, title: string | null | undefined): string {
  const cleanTitle = sanitizeText(title ?? "", EMAIL_LIMITS.subject, { multiline: false });
  const subject = sanitizeText(`${prefix}${cleanTitle}`, EMAIL_LIMITS.subject + prefix.length, { multiline: false });
  return subject || "ANC Tickets";
}

/** Enmascara un correo para los logs: "ca***@gm***.com". */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "(sin correo)";
  const [local = "", domain = ""] = email.split("@");
  const dot = domain.lastIndexOf(".");
  const host = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot) : "";
  return `${local.slice(0, 2)}***@${host.slice(0, 2)}***${tld}`;
}
