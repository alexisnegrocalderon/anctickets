/**
 * Correo de entradas: UN solo diseño que se adapta a la marca de la productora
 * (logo, acento, imagen del evento). Función pura: recibe datos, devuelve
 * { subject, html, text }. Nada de lo que escribe la productora entra como HTML.
 */
import { escapeHtml as esc } from "@/lib/html";
import { formatEventWhen } from "@/lib/event-date";
import type { EventTheme } from "@/lib/database.types";
import { buildPalette, LIGHT, resolveAccent } from "./color";
import {
  BAND,
  FONT,
  button,
  emailShell,
  ghostButton,
  h1,
  h2,
  infoRow,
  kicker,
  para,
  row,
  softBox,
  ticoSeal,
} from "./layout";
import {
  EMAIL_LIMITS,
  applyNamePlaceholder,
  buildInstagramUrl,
  buildMapsUrl,
  buildWhatsappUrl,
  firstNameOf,
  normalizeInstagram,
  normalizeWhatsapp,
  safeImageUrl,
  safeSenderName,
  safeSubject,
  sanitizeText,
  textToHtml,
  validateContactEmail,
} from "./sanitize";

export interface EmailEventData {
  title: string;
  venue: string | null;
  eventDate: string;
  imageUrl: string | null;
  theme: EventTheme | null;
  accentColor: string | null;
  organizerLogoUrl: string | null;
  welcome?: string | null;
  access?: string | null;
  rules?: string | null;
  directions?: string | null;
  contactEmail?: string | null;
  contactInstagram?: string | null;
  contactWhatsapp?: string | null;
  useEventImage?: boolean | null;
}

export interface EmailTicketData {
  typeName: string;
  qrCode: string;
  holderName: string | null;
  note?: string | null;
}

export interface TicketEmailData {
  siteUrl: string;
  kind: "sale" | "free" | "courtesy";
  producerName: string | null;
  event: EmailEventData;
  tickets: EmailTicketData[];
  /** Nombre para el saludo y {nombre}; si falta se usa el del primer titular. */
  greetingName?: string | null;
  /** Correo de prueba: asunto "[Prueba]" y aviso en el cuerpo. */
  isTest?: boolean;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
  /** reply_to ya validado (o null). */
  replyTo: string | null;
  /** Nombre del remitente ya sanitizado. */
  senderName: string;
}

export function imageEnv(siteUrl: string) {
  return { siteUrl, supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL };
}

/** Datos del evento ya saneados (lo único que usan los renderizadores). */
export function cleanEventBlocks(event: EmailEventData, name: string | null) {
  const f = (v: string | null | undefined, max: number) => {
    const t = sanitizeText(v ?? "", max);
    return t ? applyNamePlaceholder(t, name) : "";
  };
  const igUser = normalizeInstagram(event.contactInstagram ?? "");
  const wa = normalizeWhatsapp(event.contactWhatsapp ?? "");
  return {
    welcome: f(event.welcome, EMAIL_LIMITS.welcome),
    access: f(event.access, EMAIL_LIMITS.access),
    rules: f(event.rules, EMAIL_LIMITS.rules),
    directions: f(event.directions, EMAIL_LIMITS.directions),
    contactEmail: validateContactEmail(event.contactEmail ?? ""),
    instagram: igUser,
    instagramUrl: igUser ? buildInstagramUrl(igUser) : null,
    whatsappUrl: wa ? buildWhatsappUrl(wa) : null,
    mapsUrl: buildMapsUrl(event.venue),
  };
}

/** Cabecera común: banda con logo (o nombre), portada opcional y barra de acento. */
export function headerRows(opts: {
  siteUrl: string;
  producerName: string;
  logoUrl: string | null;
  coverUrl: string | null;
  coverAlt: string;
  palette: ReturnType<typeof buildPalette>;
}): string {
  const { palette: p } = opts;
  const brand = opts.logoUrl
    ? `<img src="${esc(opts.logoUrl)}" alt="${esc(opts.producerName)}" height="44" style="display:block;height:44px;max-height:44px;width:auto;max-width:220px;border:0;">`
    : `<span style="font-family:${FONT};font-size:18px;line-height:1.3;font-weight:800;letter-spacing:.5px;color:${p.inkDark};word-break:break-word;">${esc(opts.producerName)}</span>`;
  const cover = opts.coverUrl
    ? `<tr><td style="font-size:0;line-height:0;"><img src="${esc(opts.coverUrl)}" alt="${esc(opts.coverAlt)}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></td></tr>`
    : "";
  return `<tr><td class="em-pad" bgcolor="${BAND}" style="background:${BAND};padding:18px 28px;">${brand}</td></tr>
${cover}<tr><td class="em-bar" height="4" bgcolor="${p.btnBg}" style="height:4px;background:${p.btnBg};font-size:0;line-height:0;">&nbsp;</td></tr>`;
}

export function footerFor(producerName: string, siteUrl: string, extra = ""): string {
  return `${ticoSeal(siteUrl)}${extra}<strong>${esc(producerName)}</strong><br><span style="opacity:.85;">Entradas por ANC Tickets</span><br><a href="${esc(siteUrl)}/mis-entradas" class="em-muted" style="color:${LIGHT.muted};text-decoration:underline;">${esc(siteUrl.replace(/^https?:\/\//, ""))}/mis-entradas</a>`;
}

function ticketCard(
  t: EmailTicketData,
  index: number,
  total: number,
  siteUrl: string,
  p: ReturnType<typeof buildPalette>
): string {
  const type = esc(sanitizeText(t.typeName, 80, { multiline: false }) || "Entrada");
  const holder = sanitizeText(t.holderName ?? "", 80, { multiline: false });
  const note = sanitizeText(t.note ?? "", EMAIL_LIMITS.ticketNote);
  const code = sanitizeText(t.qrCode, 64, { multiline: false });
  // Solo un código con forma de UUID genera imagen; cualquier otra cosa se muestra como texto.
  const qr = /^[A-Za-z0-9-]{8,64}$/.test(code) ? `${siteUrl}/api/qr/${encodeURIComponent(code)}` : null;
  return softBox(
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td class="em-ink" style="font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:${p.inkLight};">${total > 1 ? `Entrada ${index + 1} de ${total}` : "Tu entrada"}</td></tr>
<tr><td class="em-text" style="padding-top:4px;font-family:${FONT};font-size:20px;line-height:1.25;font-weight:800;color:${LIGHT.text};word-break:break-word;overflow-wrap:anywhere;">${type}</td></tr>
${holder ? `<tr><td class="em-muted" style="padding-top:2px;font-family:${FONT};font-size:14px;line-height:1.4;color:${LIGHT.muted};word-break:break-word;">A nombre de ${esc(holder)}</td></tr>` : ""}
${
  qr
    ? `<tr><td align="center" style="padding:16px 0 4px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#ffffff" style="background:#ffffff;border-radius:12px;padding:8px;border:1px solid ${LIGHT.border};"><img src="${esc(qr)}" alt="Código QR de la entrada ${esc(String(index + 1))}" width="176" height="176" style="display:block;width:176px;height:176px;border:0;"></td></tr></table></td></tr>`
    : ""
}
<tr><td align="center" class="em-muted" style="padding-top:6px;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:11px;line-height:1.4;color:${LIGHT.muted};word-break:break-all;">${esc(code)}</td></tr>
${
  note
    ? `<tr><td style="padding-top:14px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="em-bar" width="4" bgcolor="${p.btnBg}" style="width:4px;background:${p.btnBg};font-size:0;line-height:0;">&nbsp;</td><td class="em-text" style="padding:2px 0 2px 12px;font-family:${FONT};font-size:14px;line-height:1.55;color:${LIGHT.text};word-break:break-word;overflow-wrap:anywhere;"><strong>Para esta entrada:</strong> ${textToHtml(note)}</td></tr></table></td></tr>`
    : ""
}
</table>`,
    "margin:0 0 14px;"
  );
}

function section(title: string, bodyHtml: string, p: ReturnType<typeof buildPalette>, extra = ""): string {
  return row(`${h2(title, p)}${para(bodyHtml, { margin: "0 0 0 14px" })}${extra}`);
}

export function renderTicketEmail(data: TicketEmailData): RenderedEmail {
  const site = data.siteUrl.replace(/\/+$/, "");
  const ev = data.event;
  const p = buildPalette(resolveAccent(ev.theme, ev.accentColor));
  const producer = sanitizeText(data.producerName ?? "", 80, { multiline: false }) || "ANC Tickets";
  const title = sanitizeText(ev.title, 140, { multiline: false }) || "Tu evento";
  const venue = sanitizeText(ev.venue ?? "", 160, { multiline: false });
  const when = formatEventWhen(ev.eventDate);
  const name = firstNameOf(data.greetingName ?? data.tickets.find((t) => t.holderName)?.holderName ?? null);
  const blocks = cleanEventBlocks(ev, name);

  const env = imageEnv(site);
  const logo = safeImageUrl(ev.organizerLogoUrl, env);
  const cover = ev.useEventImage === false ? null : safeImageUrl(ev.imageUrl, env);

  const courtesy = data.kind === "courtesy";
  const kickerText = courtesy ? "Tienes una invitación" : data.kind === "free" ? "Entradas confirmadas" : "Compra confirmada";
  const n = data.tickets.length;
  const introText = courtesy
    ? `${producer} te invita a este evento. Tus ${n === 1 ? "entrada está lista" : "entradas están listas"}: muestra el código QR de ${n === 1 ? "la entrada" : "cada una"} en el ingreso, desde tu celular.`
    : `Tus ${n === 1 ? "entrada está lista" : "entradas están listas"}. Muestra el código QR de ${n === 1 ? "la entrada" : "cada una"} en el ingreso del evento, desde tu celular.`;
  const intro = esc(introText);

  const rows: string[] = [];
  rows.push(
    headerRows({ siteUrl: site, producerName: producer, logoUrl: logo, coverUrl: cover, coverAlt: title, palette: p })
  );

  if (data.isTest) {
    rows.push(
      row(
        softBox(
          `<span class="em-text" style="font-family:${FONT};font-size:14px;line-height:1.5;color:${LIGHT.text};"><strong>Esto es una prueba.</strong> Así verán el correo tus compradores. Los códigos QR de ejemplo no sirven en la puerta.</span>`
        ),
        "22px 28px 0"
      )
    );
  }

  rows.push(
    row(
      `${kicker(kickerText, p)}${h1(esc(title))}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:14px;">
${when ? infoRow("Cuándo", esc(when)) : ""}${venue ? infoRow("Dónde", esc(venue)) : ""}
</table>${
        venue && blocks.mapsUrl && !blocks.directions
          ? `<p style="margin:6px 0 0;font-family:${FONT};font-size:14px;"><a href="${esc(blocks.mapsUrl)}" target="_blank" class="em-ink" style="color:${p.inkLight};font-weight:700;text-decoration:underline;">Abrir en Maps</a></p>`
          : ""
      }`,
      "24px 28px 20px"
    )
  );

  rows.push(
    row(
      `${para(`<strong>${name ? `Hola ${esc(name)},` : "Hola,"}</strong> ${intro}`, { size: 16 })}${
        blocks.welcome ? `<div style="height:12px;line-height:12px;font-size:0;">&nbsp;</div>${para(textToHtml(blocks.welcome), { size: 16 })}` : ""
      }`,
      "0 28px 22px"
    )
  );

  rows.push(
    row(
      `${data.tickets.map((t, i) => ticketCard(t, i, n, site, p)).join("")}
<div style="height:6px;line-height:6px;font-size:0;">&nbsp;</div>
${button({ href: `${site}/mis-entradas`, label: "Ver mis entradas", p })}
${para("Si no ves los códigos, ábrelos desde ese botón con tu cuenta.", { size: 13, muted: true, margin: "12px 0 0" })}`,
      "0 28px 28px"
    )
  );

  if (blocks.access) rows.push(section("Información de acceso", textToHtml(blocks.access), p));
  if (blocks.rules) rows.push(section("Reglas del evento", textToHtml(blocks.rules), p));
  if (blocks.directions) {
    rows.push(
      section(
        "Cómo llegar",
        textToHtml(blocks.directions),
        p,
        blocks.mapsUrl ? `<div style="margin:12px 0 0 14px;">${ghostButton({ href: blocks.mapsUrl, label: "Abrir en Maps", p })}</div>` : ""
      )
    );
  }
  if (blocks.instagramUrl || blocks.whatsappUrl || blocks.contactEmail) {
    const btns = [
      blocks.instagramUrl ? ghostButton({ href: blocks.instagramUrl, label: `Instagram @${blocks.instagram}`, p }) : "",
      blocks.whatsappUrl ? ghostButton({ href: blocks.whatsappUrl, label: "Escribir por WhatsApp", p }) : "",
      blocks.contactEmail ? ghostButton({ href: `mailto:${blocks.contactEmail}`, label: blocks.contactEmail, p }) : "",
    ].join("");
    rows.push(
      row(
        `${h2("Contacto", p)}${para(`¿Dudas? Escríbele a ${esc(producer)}.`, { margin: "0 0 12px 14px" })}<div style="margin-left:14px;">${btns}</div>`
      )
    );
  }

  const preheader = `Tus entradas para ${title}${when ? `: ${when}` : ""}`;
  const html = emailShell({ title, preheader, palette: p, rows: rows.join("\n"), footerHtml: footerFor(producer, site) });

  // Texto plano alternativo, del mismo contenido.
  const t: string[] = [];
  if (data.isTest) t.push("[PRUEBA] Así verán el correo tus compradores. Los QR de ejemplo no sirven en la puerta.", "");
  t.push(kickerText.toUpperCase(), title);
  if (when) t.push(`Cuándo: ${when}`);
  if (venue) t.push(`Dónde: ${venue}`);
  t.push("", `${name ? `Hola ${name},` : "Hola,"} ${introText}`);
  if (blocks.welcome) t.push("", blocks.welcome);
  t.push("", n === 1 ? "TU ENTRADA" : `TUS ENTRADAS (${n})`);
  data.tickets.forEach((tk) => {
    const note = sanitizeText(tk.note ?? "", EMAIL_LIMITS.ticketNote);
    const holder = sanitizeText(tk.holderName ?? "", 80, { multiline: false });
    t.push(`- ${sanitizeText(tk.typeName, 80, { multiline: false }) || "Entrada"}${holder ? ` (${holder})` : ""}`);
    t.push(`  Código: ${sanitizeText(tk.qrCode, 64, { multiline: false })}`);
    const rawCode = sanitizeText(tk.qrCode, 64, { multiline: false });
    if (/^[A-Za-z0-9-]{8,64}$/.test(rawCode)) t.push(`  QR: ${site}/api/qr/${encodeURIComponent(rawCode)}`);
    if (note) t.push(`  Para esta entrada: ${note.replace(/\n/g, " ")}`);
  });
  t.push("", `Ver mis entradas: ${site}/mis-entradas`);
  if (blocks.access) t.push("", "INFORMACIÓN DE ACCESO", blocks.access);
  if (blocks.rules) t.push("", "REGLAS DEL EVENTO", blocks.rules);
  if (blocks.directions || blocks.mapsUrl) {
    t.push("", "CÓMO LLEGAR");
    if (blocks.directions) t.push(blocks.directions);
    if (blocks.mapsUrl) t.push(`Abrir en Maps: ${blocks.mapsUrl}`);
  }
  if (blocks.instagramUrl || blocks.whatsappUrl || blocks.contactEmail) {
    t.push("", "CONTACTO");
    if (blocks.instagramUrl) t.push(`Instagram: ${blocks.instagramUrl}`);
    if (blocks.whatsappUrl) t.push(`WhatsApp: ${blocks.whatsappUrl}`);
    if (blocks.contactEmail) t.push(`Correo: ${blocks.contactEmail}`);
  }
  t.push("", "--", `${producer} · Entradas por ANC Tickets`);

  return {
    subject: safeSubject(data.isTest ? "[Prueba] Tus entradas para " : "Tus entradas para ", ev.title),
    html,
    text: t.join("\n"),
    replyTo: blocks.contactEmail,
    senderName: safeSenderName(data.producerName),
  };
}
