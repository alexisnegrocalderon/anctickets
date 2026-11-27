/**
 * Correos de plantilla FIJA de ANC: aviso de venta a la productora, resumen
 * diario y aviso de cambio o cancelación a los compradores. La única parte
 * escrita por una persona es el mensaje del aviso (solo texto, sin enlaces).
 */
import { escapeHtml as esc } from "@/lib/html";
import { formatEventWhen } from "@/lib/event-date";
import type { EventTheme } from "@/lib/database.types";
import { buildPalette, LIGHT, resolveAccent } from "./color";
import { BAND, FONT, button, emailShell, h1, infoRow, kicker, money, para, row, softBox } from "./layout";
import { EMAIL_LIMITS, firstNameOf, safeSenderName, safeSubject, sanitizeText, textToHtml, validateContactEmail } from "./sanitize";
import type { RenderedEmail } from "./template";

const ANC_PALETTE = () => buildPalette("#ff206e");

function ancHeader(p: ReturnType<typeof buildPalette>): string {
  return `<tr><td class="em-pad" bgcolor="${BAND}" style="background:${BAND};padding:18px 28px;"><span style="font-family:${FONT};font-size:18px;font-weight:800;letter-spacing:.5px;color:#ffffff;">ANC Tickets</span></td></tr>
<tr><td class="em-bar" height="4" bgcolor="${p.btnBg}" style="height:4px;background:${p.btnBg};font-size:0;line-height:0;">&nbsp;</td></tr>`;
}

const ancFooter = (site: string) =>
  `<strong>ANC Tickets</strong><br>Aviso automático para tu productora<br><a href="${esc(site)}/dashboard" class="em-muted" style="color:${LIGHT.muted};text-decoration:underline;">${esc(site.replace(/^https?:\/\//, ""))}/dashboard</a>`;

// ---------------------------------------------------------------------------
// Aviso de venta
// ---------------------------------------------------------------------------

export interface ProducerSaleData {
  siteUrl: string;
  eventId: string;
  eventTitle: string;
  kind: "sale" | "free";
  /** Tipo de entrada y cantidad. */
  lines: { name: string; quantity: number }[];
  /** Lo que recibe la productora: suma de unit_base_price * quantity. */
  amount: number;
  sold: number;
  total: number;
  /** Solo nombre de pila; nunca correo ni teléfono. */
  buyerName?: string | null;
}

export function renderProducerSaleEmail(d: ProducerSaleData): RenderedEmail {
  const site = d.siteUrl.replace(/\/+$/, "");
  const p = ANC_PALETTE();
  const title = sanitizeText(d.eventTitle, 140, { multiline: false }) || "Tu evento";
  const qty = d.lines.reduce((s, l) => s + l.quantity, 0);
  const buyer = firstNameOf(d.buyerName ?? null);
  const pct = d.total > 0 ? Math.max(0, Math.min(100, Math.round((d.sold / d.total) * 100))) : 0;
  const panel = `${site}/dashboard/events/${encodeURIComponent(d.eventId)}/edit?tab=ventas`;
  const lines = d.lines.map((l) => ({ name: sanitizeText(l.name, 80, { multiline: false }) || "Entrada", quantity: l.quantity }));
  const kickerText = d.kind === "free" ? "Nueva entrada gratis" : "Nueva venta";
  const amountText = d.kind === "free" ? "Gratis" : money(d.amount);

  const linesHtml = lines
    .map(
      (l) =>
        `<tr><td class="em-text" style="padding:3px 0;font-family:${FONT};font-size:16px;line-height:1.4;color:${LIGHT.text};word-break:break-word;">${esc(String(l.quantity))} × <strong>${esc(l.name)}</strong></td></tr>`
    )
    .join("");

  const rows = [
    ancHeader(p),
    row(
      `${kicker(kickerText, p)}${h1(esc(title))}
${para(buyer ? `${esc(buyer)} compró ${qty === 1 ? "1 entrada" : `${qty} entradas`}.` : `Se ${qty === 1 ? "vendió 1 entrada" : `vendieron ${qty} entradas`}.`, { size: 16, margin: "14px 0 0" })}`,
      "24px 28px 16px"
    ),
    row(
      softBox(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${linesHtml}</table>
<p class="em-muted" style="margin:14px 0 0;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${LIGHT.muted};">Recibes</p>
<p class="em-text" style="margin:2px 0 0;font-family:${FONT};font-size:30px;line-height:1.1;font-weight:800;color:${LIGHT.text};">${esc(amountText)}</p>`
      ),
      "0 28px 16px"
    ),
    row(
      `<p class="em-text" style="margin:0 0 8px;font-family:${FONT};font-size:15px;color:${LIGHT.text};"><strong>${esc(String(d.sold))} de ${esc(String(d.total))}</strong> entradas vendidas</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="em-border" style="border:1px solid ${LIGHT.border};border-radius:999px;"><tr>
<td width="${pct}%" class="em-bar" bgcolor="${p.btnBg}" style="width:${pct}%;height:10px;background:${p.btnBg};border-radius:999px;font-size:0;line-height:0;">&nbsp;</td>
<td style="font-size:0;line-height:0;">&nbsp;</td></tr></table>`,
      "0 28px 24px"
    ),
    row(button({ href: panel, label: "Ver en el panel", p }), "0 28px 28px"),
  ].join("\n");

  const text = [
    kickerText.toUpperCase(),
    title,
    buyer ? `${buyer} compró ${qty} ${qty === 1 ? "entrada" : "entradas"}.` : "",
    ...lines.map((l) => `- ${l.quantity} x ${l.name}`),
    `Recibes: ${amountText}`,
    `${d.sold} de ${d.total} entradas vendidas`,
    "",
    `Ver en el panel: ${panel}`,
  ]
    .filter((x) => x !== "")
    .join("\n");

  return {
    subject: safeSubject(d.kind === "free" ? "Nueva entrada gratis: " : "Nueva venta: ", d.eventTitle),
    html: emailShell({ title: `${kickerText}: ${title}`, preheader: `${amountText} · ${d.sold} de ${d.total} vendidas`, palette: p, rows, footerHtml: ancFooter(site) }),
    text,
    replyTo: null,
    senderName: "ANC Tickets",
  };
}

// ---------------------------------------------------------------------------
// Resumen diario
// ---------------------------------------------------------------------------

export interface ProducerSummaryData {
  siteUrl: string;
  /** Día resumido, ya formateado ("jueves 26 de noviembre"). */
  dayLabel: string;
  events: { id: string; title: string; tickets: number; amount: number; sold: number; total: number }[];
}

export function renderProducerSummaryEmail(d: ProducerSummaryData): RenderedEmail {
  const site = d.siteUrl.replace(/\/+$/, "");
  const p = ANC_PALETTE();
  const totalTickets = d.events.reduce((s, e) => s + e.tickets, 0);
  const totalAmount = d.events.reduce((s, e) => s + e.amount, 0);
  const day = sanitizeText(d.dayLabel, 60, { multiline: false });

  const cards = d.events
    .map((e) => {
      const t = sanitizeText(e.title, 140, { multiline: false }) || "Evento";
      return row(
        softBox(
          `<p class="em-text" style="margin:0;font-family:${FONT};font-size:17px;line-height:1.3;font-weight:800;color:${LIGHT.text};word-break:break-word;">${esc(t)}</p>
<p class="em-text" style="margin:6px 0 0;font-family:${FONT};font-size:15px;line-height:1.5;color:${LIGHT.text};">${esc(String(e.tickets))} ${e.tickets === 1 ? "entrada" : "entradas"} · <strong>${esc(money(e.amount))}</strong></p>
<p class="em-muted" style="margin:2px 0 0;font-family:${FONT};font-size:13px;color:${LIGHT.muted};">${esc(String(e.sold))} de ${esc(String(e.total))} vendidas en total</p>
<p style="margin:8px 0 0;font-family:${FONT};font-size:14px;"><a class="em-ink" href="${esc(`${site}/dashboard/events/${encodeURIComponent(e.id)}/edit?tab=ventas`)}" style="color:${p.inkLight};font-weight:700;text-decoration:underline;">Ver en el panel</a></p>`
        ),
        "0 28px 12px"
      );
    })
    .join("\n");

  const rows = [
    ancHeader(p),
    row(
      `${kicker("Resumen de ventas", p)}${h1(esc(`${totalTickets} ${totalTickets === 1 ? "entrada vendida" : "entradas vendidas"}`))}
${para(`${esc(day)} · <strong>${esc(money(totalAmount))}</strong> para ti`, { size: 16, margin: "12px 0 0" })}`,
      "24px 28px 18px"
    ),
    cards,
    row("", "0 0 12px"),
  ].join("\n");

  const text = [
    `RESUMEN DE VENTAS · ${day}`,
    `${totalTickets} ${totalTickets === 1 ? "entrada" : "entradas"} · ${money(totalAmount)}`,
    "",
    ...d.events.map((e) => `- ${sanitizeText(e.title, 140, { multiline: false })}: ${e.tickets} entradas · ${money(e.amount)} (${e.sold} de ${e.total} vendidas)`),
    "",
    `Panel: ${site}/dashboard`,
  ].join("\n");

  return {
    subject: safeSubject("Resumen de ventas: ", day),
    html: emailShell({ title: "Resumen de ventas", preheader: `${totalTickets} entradas · ${money(totalAmount)}`, palette: p, rows, footerHtml: ancFooter(site) }),
    text,
    replyTo: null,
    senderName: "ANC Tickets",
  };
}

// ---------------------------------------------------------------------------
// Aviso de cambio o cancelación a los compradores
// ---------------------------------------------------------------------------

export interface EventNoticeData {
  siteUrl: string;
  kind: "cancelled" | "changed";
  message: string;
  producerName: string | null;
  contactEmail?: string | null;
  event: {
    title: string;
    venue: string | null;
    eventDate: string;
    status: string;
    theme: EventTheme | null;
    accentColor: string | null;
  };
}

/** El mensaje de un aviso: solo texto, sin enlaces ni direcciones web. */
export function sanitizeNoticeMessage(input: unknown): string {
  return sanitizeText(input, EMAIL_LIMITS.noticeMessage);
}

/** ¿El texto parece traer un enlace? (se rechaza al guardar el aviso). */
export function hasLink(text: string): boolean {
  return /(?:https?:|ftp:|mailto:|www\.|javascript:|data:)|\b[a-z0-9-]+\.(?:com|cl|net|org|io|co|me|ly|app|link|xyz|info|biz|gl)\b/i.test(text);
}

export function renderEventNoticeEmail(d: EventNoticeData): RenderedEmail {
  const site = d.siteUrl.replace(/\/+$/, "");
  const p = buildPalette(resolveAccent(d.event.theme, d.event.accentColor));
  const producer = sanitizeText(d.producerName ?? "", 80, { multiline: false }) || "la productora";
  const title = sanitizeText(d.event.title, 140, { multiline: false }) || "Tu evento";
  const venue = sanitizeText(d.event.venue ?? "", 160, { multiline: false });
  const when = formatEventWhen(d.event.eventDate);
  const message = sanitizeNoticeMessage(d.message);
  const cancelled = d.kind === "cancelled" || d.event.status === "cancelled";
  const kickerText = cancelled ? "Evento cancelado" : "Cambios en tu evento";
  const lead = cancelled
    ? "Lamentamos avisarte que este evento fue cancelado. Tus entradas ya no serán válidas."
    : "La productora hizo cambios en este evento. Tus entradas siguen siendo válidas.";
  const reimb = "Si pagaste tus entradas y tienes dudas sobre el reembolso, escríbele directamente a la productora.";
  const contactEmail = validateContactEmail(d.contactEmail ?? "");

  const rows = [
    ancHeader(p),
    row(`${kicker(kickerText, p)}${h1(esc(title))}${para(esc(lead), { size: 16, margin: "14px 0 0" })}`, "24px 28px 18px"),
    cancelled
      ? ""
      : row(
          softBox(
            `<p class="em-muted" style="margin:0 0 6px;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${LIGHT.muted};">Datos actuales</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${when ? infoRow("Cuándo", esc(when)) : ""}${venue ? infoRow("Dónde", esc(venue)) : ""}</table>`
          ),
          "0 28px 16px"
        ),
    row(
      `<p class="em-muted" style="margin:0 0 6px;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${LIGHT.muted};">Mensaje de ${esc(producer)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="em-bar" width="4" bgcolor="${p.btnBg}" style="width:4px;background:${p.btnBg};font-size:0;line-height:0;">&nbsp;</td><td class="em-text" style="padding:2px 0 2px 14px;font-family:${FONT};font-size:16px;line-height:1.6;color:${LIGHT.text};word-break:break-word;overflow-wrap:anywhere;">${textToHtml(message)}</td></tr></table>`,
      "0 28px 20px"
    ),
    cancelled ? row(para(esc(reimb), { size: 14, muted: true }), "0 28px 20px") : "",
    row(button({ href: `${site}/mis-entradas`, label: "Ver mis entradas", p }), "0 28px 28px"),
  ]
    .filter(Boolean)
    .join("\n");

  const text = [
    kickerText.toUpperCase(),
    title,
    "",
    lead,
    ...(cancelled ? [] : ["", "Datos actuales:", when ? `Cuándo: ${when}` : "", venue ? `Dónde: ${venue}` : ""].filter((x) => x !== "")),
    "",
    `Mensaje de ${producer}:`,
    message,
    ...(cancelled ? ["", reimb] : []),
    "",
    `Ver mis entradas: ${site}/mis-entradas`,
    "",
    "--",
    "ANC Tickets",
  ].join("\n");

  return {
    subject: safeSubject(cancelled ? "Evento cancelado: " : "Cambios en el evento: ", d.event.title),
    html: emailShell({
      title: `${kickerText}: ${title}`,
      preheader: cancelled ? `${title} fue cancelado` : `Cambios en ${title}`,
      palette: p,
      rows,
      footerHtml: `<strong>${esc(producer)}</strong><br>Entradas por ANC Tickets`,
    }),
    text,
    replyTo: contactEmail,
    senderName: safeSenderName(d.producerName),
  };
}
