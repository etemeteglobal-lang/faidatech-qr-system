import QRCode from "qrcode";
import sharp from "sharp";
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

export type QrLogoPlacement = "none" | "center" | "above" | "top" | "bottom";

export type QrLogoOptions = {
  logoUrl?: string;
  logoPlacement?: QrLogoPlacement;
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

function safeImageUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

async function logoDataUri(logoUrl: string | undefined): Promise<string | null> {
  const safeUrl = safeImageUrl(logoUrl);
  if (!safeUrl) return null;
  try {
    const response = await fetch(safeUrl, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.toLowerCase() ?? "";
    if (!contentType.startsWith("image/") || !["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"].includes(contentType)) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > 512 * 1024) return null;
    return `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`;
  } catch {
    return null;
  }
}

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function addLogo(svg: string, logo: string | null, placement: QrLogoPlacement): string {
  if (!logo || placement === "none") return svg;
  const match = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (!match) return svg;
  const width = Number(match[1]);
  const height = Number(match[2]);
  const size = width * (placement === "center" ? 0.19 : 0.14);
  const normalized = placement === "top" ? "above" : placement;
  const x = (width - size) / 2;
  const y = normalized === "above" ? Math.max(1, (height - width - size) / 2) : normalized === "bottom" ? height - size - 2 : (height - size) / 2;
  const backing = normalized === "center"
    ? `<rect x="${x - size * 0.22}" y="${y - size * 0.22}" width="${size * 1.44}" height="${size * 1.44}" rx="${size * 0.12}" fill="#ffffff"/>`
    : "";
  const markup = `${backing}<image href="${escapeXml(logo)}" x="${x}" y="${y}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/>`;
  return svg.replace("</svg>", `${markup}</svg>`);
}

async function generateQrSvgMarkup(shortCode: string, qrForeground?: string, qrBackground?: string, logo?: QrLogoOptions): Promise<string> {
  const publicUrl = getPublicQrUrl(shortCode);
  const svg = await QRCode.toString(publicUrl, { ...optionsFor(qrForeground, qrBackground), type: "svg" });
  return addLogo(svg, await logoDataUri(logo?.logoUrl), logo?.logoPlacement ?? "none");
}

export function readQrLogoOptions(payload: unknown): QrLogoOptions {
  const raw = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : {};
  const branding = raw.branding && typeof raw.branding === "object" && !Array.isArray(raw.branding) ? raw.branding as Record<string, unknown> : {};
  const logoUrl = typeof raw.qrLogoUrl === "string" ? raw.qrLogoUrl : typeof raw._qrLogo === "string" ? raw._qrLogo : typeof branding.logoUrl === "string" ? branding.logoUrl : typeof raw._brandLogo === "string" ? raw._brandLogo : undefined;
  const rawPlacement = raw.qrLogoPlacement ?? raw.logoPlacement ?? raw._logoPlacement;
  const logoPlacement: QrLogoPlacement = rawPlacement === "above" ? "above" : rawPlacement === "top" ? "top" : rawPlacement === "bottom" ? "bottom" : rawPlacement === "none" ? "none" : logoUrl ? "center" : "none";
  return { logoUrl, logoPlacement };
}

export async function generateQrImageDataUrl(shortCode: string, qrForeground?: string, qrBackground?: string, logo?: QrLogoOptions): Promise<string> {
  const png = await generateQrPng(shortCode, qrForeground, qrBackground, logo);
  return `data:image/png;base64,${png.toString("base64")}`;
}

export async function generateQrPng(shortCode: string, qrForeground?: string, qrBackground?: string, logo?: QrLogoOptions): Promise<Buffer> {
  const svg = await generateQrSvgMarkup(shortCode, qrForeground, qrBackground, logo);
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function generateQrSvg(shortCode: string, qrForeground?: string, qrBackground?: string, logo?: QrLogoOptions): Promise<string> {
  return generateQrSvgMarkup(shortCode, qrForeground, qrBackground, logo);
}
