import { Resend } from "resend";
import { generateQrDataUrl } from "@/lib/qr";

interface TicketForEmail {
  ticketTypeName: string;
  qrCode: string;
}

export async function sendTicketConfirmationEmail(params: {
  to: string;
  eventTitle: string;
  eventDate: string;
  venue: string | null;
  tickets: TicketForEmail[];
}) {
  const resend = new Resend(process.env.RESEND_API_KEY);

  const ticketsHtml = (
    await Promise.all(
      params.tickets.map(async (ticket) => {
        const qrDataUrl = await generateQrDataUrl(ticket.qrCode);
        return `
          <div style="margin-bottom:16px;padding:16px;border:1px solid #e5e5e5;border-radius:12px;">
            <p style="margin:0 0 8px;font-weight:600;">${ticket.ticketTypeName}</p>
            <img src="${qrDataUrl}" alt="Código QR" width="200" height="200" />
            <p style="margin:8px 0 0;font-size:12px;color:#666;">Código: ${ticket.qrCode}</p>
          </div>
        `;
      })
    )
  ).join("");

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "ANC Tickets <tickets@ancdigital.cl>",
    to: params.to,
    subject: `Tus entradas para ${params.eventTitle}`,
    html: `
      <div style="font-family:sans-serif;color:#111;max-width:480px;margin:0 auto;">
        <h1 style="font-size:20px;">¡Compra confirmada!</h1>
        <p><strong>${params.eventTitle}</strong></p>
        <p>${new Date(params.eventDate).toLocaleString("es-CL", { dateStyle: "full", timeStyle: "short" })}</p>
        ${params.venue ? `<p>${params.venue}</p>` : ""}
        <p>Presenta el código QR de cada entrada en el ingreso del evento, desde cualquier dispositivo.</p>
        ${ticketsHtml}
      </div>
    `,
  });
}
