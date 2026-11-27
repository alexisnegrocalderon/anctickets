/**
 * Piezas compartidas de los correos: carcasa HTML (tablas con estilos en
 * línea, 600px máximo, fluida en móvil), botón "a prueba de balas" y bloques.
 * Todo texto dinámico entra ya escapado; las URLs se escapan aquí al ponerlas
 * en un atributo.
 */
import { escapeHtml as esc } from "@/lib/html";
import { DARK, LIGHT, type EmailPalette } from "./color";

export const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
/** Banda de cabecera neutra y oscura: los logos de las productoras se diseñan para fondo oscuro. */
export const BAND = "#161618";

function css(p: EmailPalette): string {
  return `
body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
table,td{mso-table-lspace:0;mso-table-rspace:0}
img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic}
a{text-decoration:none}
@media (max-width:620px){
  .em-pad{padding-left:20px!important;padding-right:20px!important}
  .em-h1{font-size:28px!important;line-height:1.12!important}
  .em-outer{padding:12px 8px!important}
}
@media (prefers-color-scheme:dark){
  .em-page{background:${DARK.page}!important}
  .em-card{background:${DARK.card}!important}
  .em-soft{background:${DARK.soft}!important}
  .em-text{color:${DARK.text}!important}
  .em-muted{color:${DARK.muted}!important}
  .em-border{border-color:${DARK.border}!important}
  .em-ink{color:${p.inkDark}!important}
  .em-bar{background:${p.btnBgDark}!important}
  .em-btn{background:${p.btnBgDark}!important;border-color:${p.btnBorderDark ?? p.btnBgDark}!important}
  .em-btn-a{color:${p.btnTextDark}!important}
  .em-ghost{border-color:${p.inkDark}!important}
}
[data-ogsc] .em-page{background:${DARK.page}!important}
[data-ogsc] .em-card{background:${DARK.card}!important}
[data-ogsc] .em-soft{background:${DARK.soft}!important}
[data-ogsc] .em-text{color:${DARK.text}!important}
[data-ogsc] .em-muted{color:${DARK.muted}!important}
[data-ogsc] .em-ink{color:${p.inkDark}!important}
`;
}

/** Carcasa: head, preheader oculto, tarjeta de 600px y pie. `rows` son las filas (<tr>) de la tarjeta. */
export function emailShell(opts: {
  title: string;
  preheader: string;
  palette: EmailPalette;
  rows: string;
  footerHtml: string;
}): string {
  const pre = esc(opts.preheader);
  return `<!doctype html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(opts.title)}</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<style>:root{color-scheme:light dark;supported-color-schemes:light dark}${css(opts.palette)}</style>
</head>
<body class="em-page" style="margin:0;padding:0;width:100%;background:${LIGHT.page};">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:${LIGHT.page};">${pre}${"&#847;&zwnj;&nbsp;".repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="em-page" bgcolor="${LIGHT.page}" style="background:${LIGHT.page};">
<tr><td align="center" class="em-outer" style="padding:24px 12px;">
<!--[if mso]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="em-card" bgcolor="${LIGHT.card}" style="width:100%;max-width:600px;background:${LIGHT.card};border-radius:18px;overflow:hidden;">
${opts.rows}
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
<tr><td align="center" class="em-muted em-pad" style="padding:20px 28px 8px;font-family:${FONT};font-size:12px;line-height:1.6;color:${LIGHT.muted};">${opts.footerHtml}</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`;
}

/** Fila de la tarjeta con el relleno estándar. */
export function row(inner: string, pad = "0 28px 22px"): string {
  return `<tr><td class="em-pad" style="padding:${pad};font-family:${FONT};">${inner}</td></tr>`;
}

export function kicker(text: string, p: EmailPalette): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td class="em-bar" width="4" bgcolor="${p.btnBg}" style="width:4px;background:${p.btnBg};font-size:0;line-height:0;">&nbsp;</td>
<td class="em-ink" style="padding-left:10px;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:${p.inkLight};">${esc(text)}</td>
</tr></table>`;
}

export function h1(html: string): string {
  return `<h1 class="em-h1 em-text" style="margin:14px 0 0;font-family:${FONT};font-size:32px;line-height:1.1;font-weight:800;color:${LIGHT.text};word-break:break-word;overflow-wrap:anywhere;">${html}</h1>`;
}

export function h2(text: string, p: EmailPalette): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;"><tr>
<td class="em-bar" width="4" bgcolor="${p.btnBg}" style="width:4px;background:${p.btnBg};font-size:0;line-height:0;">&nbsp;</td>
<td class="em-text" style="padding-left:10px;font-family:${FONT};font-size:18px;line-height:1.3;font-weight:700;color:${LIGHT.text};">${esc(text)}</td>
</tr></table>`;
}

export function para(html: string, opts: { size?: number; muted?: boolean; margin?: string } = {}): string {
  const color = opts.muted ? LIGHT.muted : LIGHT.text;
  return `<p class="${opts.muted ? "em-muted" : "em-text"}" style="margin:${opts.margin ?? "0"};font-family:${FONT};font-size:${opts.size ?? 15}px;line-height:1.6;color:${color};word-break:break-word;overflow-wrap:anywhere;">${html}</p>`;
}

/** Etiqueta pequeña + valor (Cuándo / Dónde). */
export function infoRow(label: string, valueHtml: string): string {
  return `<tr>
<td class="em-muted" valign="top" width="64" style="width:64px;padding:6px 0;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${LIGHT.muted};">${esc(label)}</td>
<td class="em-text" valign="top" style="padding:5px 0;font-family:${FONT};font-size:16px;line-height:1.45;font-weight:600;color:${LIGHT.text};word-break:break-word;overflow-wrap:anywhere;">${valueHtml}</td>
</tr>`;
}

/** Botón principal "a prueba de balas": VML para Outlook y <a> con relleno para el resto. */
export function button(opts: { href: string; label: string; p: EmailPalette; width?: number }): string {
  const { p } = opts;
  const href = esc(opts.href);
  const label = esc(opts.label);
  const w = opts.width ?? 260;
  const border = p.btnBorder ?? p.btnBg;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0;"><tr><td align="center" class="em-btn" bgcolor="${p.btnBg}" style="border-radius:999px;background:${p.btnBg};border:2px solid ${border};">
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:48px;v-text-anchor:middle;width:${w}px;" arcsize="50%" stroke="f" fillcolor="${p.btnBg}"><w:anchorlock/><center style="color:${p.btnText};font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${label}</center></v:roundrect><![endif]-->
<!--[if !mso]><!--><a href="${href}" target="_blank" class="em-btn-a" style="display:inline-block;min-height:44px;padding:13px 30px;font-family:${FONT};font-size:16px;line-height:20px;font-weight:700;color:${p.btnText};text-decoration:none;border-radius:999px;mso-hide:all;">${label}</a><!--<![endif]-->
</td></tr></table>`;
}

/** Botón secundario (contorno) para Instagram, WhatsApp, Maps. */
export function ghostButton(opts: { href: string; label: string; p: EmailPalette }): string {
  return `<a href="${esc(opts.href)}" target="_blank" class="em-ghost em-ink" style="display:inline-block;margin:0 8px 8px 0;padding:11px 20px;min-height:44px;box-sizing:border-box;border:2px solid ${opts.p.inkLight};border-radius:999px;font-family:${FONT};font-size:14px;line-height:18px;font-weight:700;color:${opts.p.inkLight};text-decoration:none;">${esc(opts.label)}</a>`;
}

/** Cuadro con borde y fondo suave (tarjetas de entrada, mensajes). */
export function softBox(inner: string, extra = ""): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="em-soft em-border" bgcolor="${LIGHT.soft}" style="background:${LIGHT.soft};border:1px solid ${LIGHT.border};border-radius:14px;${extra}"><tr><td style="padding:16px 18px;font-family:${FONT};">${inner}</td></tr></table>`;
}

export function money(n: number): string {
  return `$${Math.round(n).toLocaleString("es-CL")}`;
}
