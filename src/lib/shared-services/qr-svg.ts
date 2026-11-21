import QRCode from "qrcode";

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

export async function generateSharedServiceQrSvg(url: string, title: string): Promise<string> {
  const raw = await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "H", margin: 4, width: 360, color: { dark: "#0F172A", light: "#FFFFFF" } });
  const viewBox = raw.match(/viewBox="([^"]+)"/);
  if (!viewBox) throw new Error("QR SVG did not include a viewBox.");
  const [x, y, width, height] = viewBox[1].trim().split(/\s+/).map(Number);
  const captionHeight = 9;
  const updated = raw.replace(viewBox[0], `viewBox="${x} ${y} ${width} ${height + captionHeight}"`)
    .replace(/<svg([^>]*)>/, `<svg$1><title>${escapeXml(title)}</title><desc>Scan this QR code to open ${escapeXml(title)}. FaidATech shared-service link.</desc>`)
    .replace("</svg>", `<text x="${x + width / 2}" y="${y + height + 6}" text-anchor="middle" font-family="Arial,sans-serif" font-size="3.5" font-weight="700" fill="#0F172A">Scan to open</text></svg>`);
  return updated;
}
