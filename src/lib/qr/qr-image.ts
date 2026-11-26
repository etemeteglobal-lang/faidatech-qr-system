import { isIP } from "node:net";
import QRCode from "qrcode";
import sharp from "sharp";
import { isQrForegroundContrastSafe } from "@/lib/qr/brand";
import { getPublicQrUrl } from "@/lib/qr/short-code";

type LogoPlacement = "none" | "center" | "above";
type DotStyle = "square" | "round" | "small" | "large" | "styled" | "circle" | "diamond" | "heart" | "line";
type FrameStyle = "none" | "square" | "rounded" | "badge" | "circle" | "brand";

function optionsFor(qrForeground?: string, qrBackground?: string) {
  const page = qrBackground ?? "#FFFFFF";
  if (!/^#[0-9A-Fa-f]{6}$/.test(page)) throw new Error("QR background color must be a #RRGGBB value.");
  const foreground = qrForeground ?? "#0F172A";
  if (!/^#[0-9A-Fa-f]{6}$/.test(foreground) || !isQrForegroundContrastSafe(foreground)) {
    throw new Error("QR foreground color must be a #RRGGBB value with at least 4.5:1 contrast against white.");
  }
  return { foreground, page };
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

function validDotStyle(value?: string): DotStyle {
  return ["square", "round", "small", "large", "styled", "circle", "diamond", "heart", "line"].includes(value ?? "") ? value as DotStyle : "square";
}

function validFrameStyle(value?: string): FrameStyle {
  return ["none", "square", "rounded", "badge", "circle", "brand"].includes(value ?? "") ? value as FrameStyle : "none";
}

function isFinderModule(x: number, y: number, size: number) {
  return (x < 8 && y < 8) || (x >= size - 8 && y < 8) || (x < 8 && y >= size - 8);
}

function renderModule(x: number, y: number, scale: number, dots: DotStyle, color: string) {
  const px = x + (1 - scale) / 2;
  const py = y + (1 - scale) / 2;
  if (dots === "diamond") return `<polygon points="${px + scale / 2},${py} ${px + scale},${py + scale / 2} ${px + scale / 2},${py + scale} ${px},${py + scale / 2}" fill="${color}"/>`;
  if (dots === "heart") return `<path d="M ${px + scale / 2} ${py + scale} C ${px + scale * .34} ${py + scale * .78}, ${px} ${py + scale * .54}, ${px + scale * .1} ${py + scale * .28} C ${px + scale * .2} ${py - scale * .02}, ${px + scale * .43} ${py + scale * .06}, ${px + scale / 2} ${py + scale * .28} C ${px + scale * .7} ${py - scale * .02}, ${px + scale * .98} ${py + scale * .02}, ${px + scale * .9} ${py + scale * .34} C ${px + scale * .82} ${py + scale * .62}, ${px + scale * .62} ${py + scale * .84}, ${px + scale / 2} ${py + scale} Z" fill="${color}"/>`;
  if (dots === "line") return `<rect x="${px}" y="${py + scale * .25}" width="${scale}" height="${scale * .5}" rx="${scale * .25}" fill="${color}"/>`;
  const radius = dots === "round" || dots === "circle" ? scale / 2 : dots === "styled" ? scale * .18 : 0;
  return `<rect x="${px}" y="${py}" width="${scale}" height="${scale}" rx="${radius}" fill="${color}"/>`;
}

async function makeQrSvg(shortCode: string, qrForeground?: string, qrBackground?: string, logoUrl?: string, placement: LogoPlacement = "none", dotStyle?: string, frameStyle?: string): Promise<string> {
  const { foreground, page } = optionsFor(qrForeground, qrBackground);
  const dots = validDotStyle(dotStyle);
  const frame = validFrameStyle(frameStyle);
  const qr = QRCode.create(getPublicQrUrl(shortCode), { errorCorrectionLevel: "H" });
  const matrix = qr.modules;
  const quiet = 4;
  const qrSize = matrix.size + quiet * 2;
  const framePad = frame === "none" ? 0 : 4;
  const logo = placement === "none" ? null : await loadLogo(logoUrl);
  const logoSize = logo ? Math.min(qrSize * 0.16, 12) : 0;
  const logoBand = logo && placement === "above" ? logoSize + 6 : 0;
  const viewWidth = qrSize + framePad * 2;
  const viewHeight = qrSize + framePad * 2 + logoBand;
  const qrX = framePad;
  const qrY = framePad + logoBand;
  const background = `<rect width="${viewWidth}" height="${viewHeight}" fill="${page}"/>`;
  const frameRadius = frame === "circle" ? Math.min(viewWidth, viewHeight) / 2 : frame === "rounded" ? 3 : frame === "badge" ? 5 : frame === "brand" ? 4 : 0;
  const frameMarkup = frame === "none" ? "" : `<rect x="0.5" y="0.5" width="${viewWidth - 1}" height="${viewHeight - 1}" rx="${frameRadius}" fill="none" stroke="${foreground}" stroke-width="${frame === "brand" || frame === "badge" ? 1.2 : 0.7}"/>`;
  const quietZone = `<rect x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" fill="#FFFFFF"/>`;
  const cells: string[] = [];
  const smallScale = dots === "small" ? 0.62 : dots === "round" || dots === "circle" ? 0.78 : dots === "styled" ? 0.86 : 1;
  for (let y = 0; y < matrix.size; y += 1) {
    for (let x = 0; x < matrix.size; x += 1) {
      if (!matrix.get(x, y)) continue;
      const finder = isFinderModule(x, y, matrix.size);
      const scale = finder || dots === "large" || dots === "square" ? 1 : smallScale;
      cells.push(renderModule(qrX + quiet + x, qrY + quiet + y, scale, finder ? "square" : dots, foreground));
    }
  }
  let logoMarkup = "";
  if (logo) {
    const uri = `data:${logo.mime};base64,${logo.data.toString("base64")}`;
    if (placement === "center") {
      const centerX = qrX + qrSize / 2;
      const centerY = qrY + qrSize / 2;
      logoMarkup = `<rect x="${centerX - logoSize * .72}" y="${centerY - logoSize * .72}" width="${logoSize * 1.44}" height="${logoSize * 1.44}" rx="1.2" fill="#FFFFFF"/><image href="${uri}" x="${centerX - logoSize / 2}" y="${centerY - logoSize / 2}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet"/>`;
    } else if (placement === "above") {
      const logoY = framePad + Math.max(0, (logoBand - logoSize) / 2);
      logoMarkup = `<image href="${uri}" x="${(viewWidth - logoSize) / 2}" y="${logoY}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet"/>`;
    }
  }
  const outputWidth = 360;
  const outputHeight = Math.round(outputWidth * viewHeight / viewWidth);
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${viewWidth} ${viewHeight}" width="${outputWidth}" height="${outputHeight}" role="img" aria-label="Scannable QR code"><title>Scannable QR code</title>${background}${frameMarkup}${quietZone}${cells.join("")}${logoMarkup}</svg>`;
}

export async function generateQrImageDataUrl(shortCode: string, qrForeground?: string, qrBackground?: string, logoUrl?: string, placement: LogoPlacement = "none", dotStyle?: string, frameStyle?: string): Promise<string> {
  const svg = await makeQrSvg(shortCode, qrForeground, qrBackground, logoUrl, placement, dotStyle, frameStyle);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}
export async function generateQrPng(shortCode: string, qrForeground?: string, qrBackground?: string, logoUrl?: string, placement: LogoPlacement = "none", dotStyle?: string, frameStyle?: string): Promise<Buffer> {
  return sharp(Buffer.from(await makeQrSvg(shortCode, qrForeground, qrBackground, logoUrl, placement, dotStyle, frameStyle))).png().toBuffer();
}
export async function generateQrSvg(shortCode: string, qrForeground?: string, qrBackground?: string, logoUrl?: string, placement: LogoPlacement = "none", dotStyle?: string, frameStyle?: string): Promise<string> {
  return makeQrSvg(shortCode, qrForeground, qrBackground, logoUrl, placement, dotStyle, frameStyle);
}
