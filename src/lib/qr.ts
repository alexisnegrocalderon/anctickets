import QRCode from "qrcode";

export async function generateQrPngBuffer(data: string): Promise<Buffer> {
  return QRCode.toBuffer(data, { type: "png", width: 320, margin: 2 });
}

export async function generateQrDataUrl(data: string): Promise<string> {
  return QRCode.toDataURL(data, { width: 320, margin: 2 });
}
