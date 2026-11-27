/**
 * Envío con Resend. El remitente real sale siempre de RESEND_FROM_EMAIL (o el
 * valor por defecto); de la productora solo se toma un nombre saneado y un
 * reply_to validado. Nunca se loguean cuerpos ni direcciones completas.
 */
import { Resend } from "resend";
import { fromHeaderForSender, maskEmail, validateContactEmail } from "./sanitize";
import { renderTicketEmail, type RenderedEmail, type TicketEmailData } from "./template";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export interface OutgoingEmail {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

/** Arma el mensaje para Resend a partir del correo renderizado (dirección real fija, reply_to validado). */
export function toOutgoing(to: string, r: RenderedEmail, fromName: "producer" | "anc" = "producer"): OutgoingEmail {
  const replyTo = validateContactEmail(r.replyTo ?? "");
  return {
    from: fromHeaderForSender(fromName === "anc" ? "ANC Tickets" : r.senderName),
    to,
    subject: r.subject,
    html: r.html,
    text: r.text,
    ...(replyTo ? { replyTo } : {}),
  };
}

/** Envía un solo correo. Lanza si Resend lo rechaza (el mensaje no incluye el destinatario completo). */
export async function sendEmail(msg: OutgoingEmail): Promise<void> {
  const { error } = await getResend().emails.send({
    from: msg.from,
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
    ...(msg.replyTo ? { replyTo: msg.replyTo } : {}),
  });
  if (error) throw new Error(`Resend rechazó el correo a ${maskEmail(msg.to)}: ${error.message}`);
}

/**
 * Envía las entradas por correo. Cada QR es una imagen servida por
 * `/api/qr/{codigo}` (los data: URI los oculta Gmail). Lanza si Resend rechaza el envío.
 */
export async function sendTicketConfirmationEmail(params: { to: string; data: TicketEmailData }) {
  const rendered = renderTicketEmail(params.data);
  await sendEmail(toOutgoing(params.to, rendered));
  return rendered;
}

/** Aviso de venta / resumen a la productora: remitente "ANC Tickets", sin reply_to. */
export async function sendAncEmail(to: string, rendered: RenderedEmail): Promise<void> {
  await sendEmail(toOutgoing(to, rendered, "anc"));
}

export const BATCH_SIZE = 100;
export const BATCH_PAUSE_MS = 600;
export const MAX_NOTICE_RECIPIENTS = 2000;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Envía un correo individual a cada destinatario (cada uno con su propio "to":
 * no se ven entre sí) usando el envío por lotes de Resend en bloques de 100,
 * con una pausa entre bloques. Devuelve cuántos salieron y cuántos fallaron.
 */
export async function sendBatchIndividually(
  recipients: string[],
  rendered: RenderedEmail,
  opts: { pauseMs?: number; onProgress?: (done: number) => void } = {}
): Promise<{ sent: number; failed: number }> {
  const resend = getResend();
  const pause = opts.pauseMs ?? BATCH_PAUSE_MS;
  const base = toOutgoing("placeholder@example.com", rendered);
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const chunk = recipients.slice(i, i + BATCH_SIZE);
    try {
      const { error } = await resend.batch.send(
        chunk.map((to) => ({
          from: base.from,
          to: [to],
          subject: base.subject,
          html: base.html,
          text: base.text,
          ...(base.replyTo ? { replyTo: base.replyTo } : {}),
        }))
      );
      if (error) {
        failed += chunk.length;
        console.error(`Lote de aviso rechazado (${chunk.length} correos): ${error.message}`);
      } else {
        sent += chunk.length;
      }
    } catch (err) {
      failed += chunk.length;
      console.error("Lote de aviso falló:", err instanceof Error ? err.message : "error desconocido");
    }
    opts.onProgress?.(sent + failed);
    if (i + BATCH_SIZE < recipients.length && pause > 0) await sleep(pause);
  }
  return { sent, failed };
}
