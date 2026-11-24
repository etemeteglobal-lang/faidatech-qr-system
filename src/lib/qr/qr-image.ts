import { isIP } from "node:net";
import QRCode from "qrcode";
import sharp from "sharp";
import { isQrForegroundContrastSafe } from "@/lib/qr/brand";
import { getPublicQrUrl } from "@/lib/qr/short-code";

type LogoPlacement = "none" | "center" | "above";
const qrOptions = {
  errorCorrectionLevel: "H" as const,
  margin: 2,
  width: 360,
  color: { dark: "#0F172A", light: "#FFFFFF" },
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
function allowedLogoHost(url: URL): boolean {
  if (url.protocol !== "https:" || url.username || url.password || isIP(url.hostname)) return false;
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!configured) return false;
  try { return url.hostname.toLowerCase() === new URL(configured).hostname.toLowerCase(); } catch { return false; }
}
async function loadLogo(urlValue?: string): Promise<{ data: Buffer; mime: string } | null> {
  if (!urlValue) return null;
  try {
    const url = new URL(urlValue);
    if (!allowedLogoHost(url)) return null;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000), redirect: "error" });
    if (!response.ok) return null;
    const mime = response.headers.get("content-type")?.split(";")[0].toLowerCase() ?? "";
    if (!["image/png", "image/jpeg", "image/webp"].includes(mime)) return null;
    if (Number(response.headers.get("content-length") ?? 0) > 3 * 1024 * 1024) return null;
    const data = Buffer.from(await response.arrayBuffer());
    if (data.length > 3 * 1024 * 1024) return null;
    const normalized = await sharp(data, { limitInputPixels: 20_000_000 }).png().toBuffer();
    return { data: normalized, mime: "image/png" };
  } catch { return null; }
}
async function makeQrSvg(shortCode: string, qrForeground?: string, qrBackground?: string, logoUrl?: string, placement: LogoPlacement = "none"): Promise<string> {
  const options = optionsFor(qrForeground, qrBackground);
  const qrSvg = await QRCode.toString(getPublicQrUrl(shortCode), { ...options, type: "svg" });
  const logo = placement === "none" ? null : await loadLogo(logoUrl);
  if (!logo) return qrSvg;
  const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(qrSvg);
  const inner = /<svg[^>]*>([\s\S]*)<\/svg>/.exec(qrSvg)?.[1];
  if (!vb || !inner) return qrSvg;
  const width = Number(vb[1]);
  const height = Number(vb[2]);
  const uri = `data:${logo.mime};base64,${logo.data.toString("base64")}`;
  if (placement === "center") {
    const size = Math.min(width, height) * 0.18;
    const cx = width / 2;
    const cy = height / 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${width} ${height}" width="360" height="360"><rect width="100%" height="100%" fill="${options.color.light}"/>${inner}<rect x="${cx - size * 0.72}" y="${cy - size * 0.72}" width="${size * 1.44}" height="${size * 1.44}" rx="2" fill="#fff"/><image href="${uri}" x="${cx - size / 2}" y="${cy - size / 2}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/></svg>`;
  }
  const size = Math.min(width * 0.16, 12);
  const band = size + 6;
  const fullHeight = height + band;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${width} ${fullHeight}" width="360" height="${Math.round(360 * fullHeight / width)}"><rect width="100%" height="100%" fill="${options.color.light}"/><image href="${uri}" x="${(width - size) / 2}" y="3" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/><g transform="translate(0 ${band})">${inner}</g></svg>`;
}
export async function generateQrImageDataUrl(shortCode: string, qrForeground?: string, qrBackground?: string, logoUrl?: string, placement: LogoPlacement = "none"): Promise<string> {
  const svg = await makeQrSvg(shortCode, qrForeground, qrBackground, logoUrl, placement);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}
export async function generateQrPng(shortCode: string, qrForeground?: string, qrBackground?: string, logoUrl?: string, placement: LogoPlacement = "none"): Promise<Buffer> {
  return sharp(Buffer.from(await makeQrSvg(shortCode, qrForeground, qrBackground, logoUrl, placement))).png().toBuffer();
}
export async function generateQrSvg(shortCode: string, qrForeground?: string, qrBackground?: string, logoUrl?: string, placement: LogoPlacement = "none"): Promise<string> {
  return makeQrSvg(shortCode, qrForeground, qrBackground, logoUrl, placement);
}
