import QRCode from "qrcode";
import { isQrForegroundContrastSafe } from "@/lib/qr/brand";
import { getPublicQrUrl } from "@/lib/qr/short-code";

const qrOptions = {
  errorCorrectionLevel: "H" as const,
  margin: 2,
  width: 360,
  color: {
    dark: "#0F172A",
    light: "#FFFFFF",
  },
};

function optionsFor(qrForeground?: string, qrBackground?: string) {
  const light = qrBackground ?? "#FFFFFF";
  if (!/^#[0-9A-Fa-f]{6}$/.test(light)) throw new Error("QR background color must be a #RRGGBB value.");
  if (qrForeground === undefined) return { ...qrOptions, color: { ...qrOptions.color, light } };
  if (!/^#[0-9A-Fa-f]{6}$/.test(qrForeground) || !isQrForegroundContrastSafe(qrForeground)) {
    throw new Error("QR foreground color must be a #RRGGBB value with at least 4.5:1 contrast against white.");
  }
  return { ...qrOptions, color: { ...qrOptions.color, dark: qrForeground, light } };
}

export async function generateQrImageDataUrl(shortCode: string, qrForeground?: string, qrBackground?: string): Promise<string> {
  const publicUrl = getPublicQrUrl(shortCode);
  return QRCode.toDataURL(publicUrl, { ...optionsFor(qrForeground, qrBackground), type: "image/png" });
}

export async function generateQrPng(shortCode: string, qrForeground?: string, qrBackground?: string): Promise<Buffer> {
  const publicUrl = getPublicQrUrl(shortCode);
  return QRCode.toBuffer(publicUrl, { ...optionsFor(qrForeground, qrBackground), type: "png" });
}

export async function generateQrSvg(shortCode: string, qrForeground?: string, qrBackground?: string): Promise<string> {
  const publicUrl = getPublicQrUrl(shortCode);
  return QRCode.toString(publicUrl, { ...optionsFor(qrForeground, qrBackground), type: "svg" });
}
