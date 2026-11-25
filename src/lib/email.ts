import { Resend } from "resend";
import { escapeHtml } from "@/lib/html";
import { siteUrl } from "@/lib/site";

export interface TicketForEmail {
  ticketTypeName: string;
  qrCode: string;
  holderName: string | null;
}

/**
 * Envía las entradas por correo. Cada QR es una imagen servida por
 * `/api/qr/{codigo}` (los data: URI los oculta Gmail). Todo texto que viene de
 * la base se escapa antes de entrar al HTML. Lanza si Resend rechaza el envío.
 */
export async function sendTicketConfirmationEmail(params: {
  to: string;
  eventTitle: string;
  eventDate: string;
  venue: string | null;
  tickets: TicketForEmail[];
}) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const site = siteUrl();

  const ticketsHtml = params.tickets
    .map((ticket) => {
      const label = [ticket.ticketTypeName, ticket.holderName].filter(Boolean).map((t) => escapeHtml(t!)).join(" · ");
      const code = escapeHtml(ticket.qrCode);
      return `
        <div style="margin-bottom:16px;padding:16px;border:1px solid #e5e5e5;border-radius:12px;text-align:center;">
          <p style="margin:0 0 8px;font-weight:600;">${label}</p>
          <img src="${site}/api/qr/${code}" alt="Código QR" width="200" height="200" style="display:block;margin:0 auto;" />
          <p style="margin:8px 0 0;font-size:12px;color:#666;">Código: ${code}</p>
        </div>
      `;
    })
    .join("");

  const when = new Date(params.eventDate).toLocaleString("es-CL", {
    dateStyle: "full",
    timeStyle: "short",
  });

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "ANC Tickets <tickets@ancdigital.cl>",
    to: params.to,
    subject: `Tus entradas para ${params.eventTitle}`,
    html: `
      <div style="font-family:sans-serif;color:#111;max-width:480px;margin:0 auto;">
        <h1 style="font-size:20px;">¡Compra confirmada!</h1>
        <p><strong>${escapeHtml(params.eventTitle)}</strong></p>
        <p>${escapeHtml(when)}</p>
        ${params.venue ? `<p>${escapeHtml(params.venue)}</p>` : ""}
        <p>Presenta el código QR de cada entrada en el ingreso del evento, desde cualquier dispositivo.</p>
        ${ticketsHtml}
        <p style="margin-top:24px;font-size:13px;">
          Si no ves los códigos, abre tus entradas en
          <a href="${site}/mis-entradas">${site}/mis-entradas</a>.
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Resend rechazó el correo: ${error.message}`);
  }
}
