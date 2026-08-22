import { generateQrDataUrl } from "@/lib/qr";

export default async function TicketQr({ value }: { value: string }) {
  const dataUrl = await generateQrDataUrl(value);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt="Código QR de la entrada"
      width={180}
      height={180}
      className="mx-auto"
    />
  );
}
