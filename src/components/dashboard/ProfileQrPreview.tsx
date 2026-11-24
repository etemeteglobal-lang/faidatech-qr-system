"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { isQrForegroundContrastSafe } from "@/lib/qr/brand";

type Props = {
  path: string;
  foreground: string;
  dots: string;
  frame: string;
  logoUrl?: string;
  logoPlacement: string;
  downloadLabel: string;
  printLabel: string;
  compact?: boolean;
};

type Matrix = { size: number; data: Uint8Array };
type Layout = { viewWidth: number; viewHeight: number; qrX: number; qrY: number; total: number; logoX: number; logoY: number; logoSize: number };

function escapeXml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function safeImageUrl(value: string | undefined) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

export default function ProfileQrPreview({ path, foreground, dots, frame, logoUrl, logoPlacement, downloadLabel, printLabel, compact = false }: Props) {
  const [origin, setOrigin] = useState("");
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  useEffect(() => setOrigin(window.location.origin), []);
  const target = origin && path ? `${origin}${path}` : "";
  const safeForeground = /^#[0-9a-fA-F]{6}$/.test(foreground) && isQrForegroundContrastSafe(foreground) ? foreground : "#0F172A";
  const safeLogo = safeImageUrl(logoUrl);
  const showLogo = Boolean(safeLogo) && logoPlacement !== "none";
  const logoAbove = logoPlacement === "above" || logoPlacement === "top";

  useEffect(() => {
    if (!target) {
      setMatrix(null);
      return;
    }
    try {
      const qr = QRCode.create(target, { errorCorrectionLevel: "H" });
      setMatrix({ size: qr.modules.size, data: qr.modules.data });
    } catch {
      setMatrix(null);
    }
  }, [target]);

  const layout = useMemo<Layout | null>(() => {
    if (!matrix) return null;
    const total = matrix.size + 8;
    const logoSize = total * (logoPlacement === "center" ? 0.15 : 0.12);
    const extra = showLogo && (logoAbove || logoPlacement === "bottom") ? logoSize + 5 : 0;
    const padding = frame === "circle" ? Math.ceil(total * 0.28) : 4;
    const qrY = padding + (showLogo && logoAbove ? extra : 0);
    return {
      viewWidth: total + padding * 2,
      viewHeight: total + padding * 2 + extra,
      qrX: padding,
      qrY,
      total,
      logoX: (total + padding * 2 - logoSize) / 2,
      logoY: logoAbove ? Math.max(1, (qrY - logoSize) / 2) : logoPlacement === "bottom" ? qrY + total + Math.max(1, (padding + extra - logoSize) / 2) : qrY + (total - logoSize) / 2,
      logoSize,
    };
  }, [frame, matrix, logoPlacement, showLogo, logoAbove]);

  const svg = useMemo(() => {
    if (!matrix || !layout) return "";
    const { size, data } = matrix;
    const { viewWidth, viewHeight, qrX, qrY, total, logoX, logoY, logoSize } = layout;
    const scale = dots === "small" ? 0.62 : dots === "round" ? 0.78 : dots === "styled" ? 0.86 : 1;
    const radius = dots === "round" ? scale / 2 : dots === "styled" ? 0.18 : 0;
    const offset = (1 - scale) / 2;
    const finder = (x: number, y: number) => (x < 8 && y < 8) || (x >= size - 8 && y < 8) || (x < 8 && y >= size - 8);
    const cells: string[] = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (!data[y * size + x]) continue;
        const eye = finder(x, y);
        const moduleScale = eye || dots === "large" ? 1 : scale;
        const moduleOffset = eye || dots === "large" ? 0 : offset;
        const moduleRadius = eye ? 0 : radius;
        cells.push(`<rect x="${qrX + x + 4 + moduleOffset}" y="${qrY + y + 4 + moduleOffset}" width="${moduleScale}" height="${moduleScale}" rx="${moduleRadius}" fill="${safeForeground}"/>`);
      }
    }

    const frameMarkup = frame === "circle"
      ? `<circle cx="${viewWidth / 2}" cy="${qrY + total / 2}" r="${total * 0.72}" fill="#ffffff" stroke="#0f766e" stroke-width="0.7"/>`
      : frame === "brand"
        ? `<rect x="0.5" y="0.5" width="${viewWidth - 1}" height="${viewHeight - 1}" rx="4" fill="#ffffff" stroke="#0f766e" stroke-width="1.5"/>`
        : frame === "rounded"
          ? `<rect x="0.5" y="0.5" width="${viewWidth - 1}" height="${viewHeight - 1}" rx="3" fill="#ffffff" stroke="#d1d5db" stroke-width="0.6"/>`
          : `<rect x="0.5" y="0.5" width="${viewWidth - 1}" height="${viewHeight - 1}" fill="#ffffff" stroke="#e2e8f0" stroke-width="0.35"/>`;
    const whiteCodePanel = `<rect x="${qrX}" y="${qrY}" width="${total}" height="${total}" fill="#ffffff"/>`;
    const logoMarkup = showLogo
      ? logoPlacement === "center"
        ? `<rect x="${qrX + total / 2 - logoSize * 0.72}" y="${qrY + total / 2 - logoSize * 0.72}" width="${logoSize * 1.44}" height="${logoSize * 1.44}" rx="1.1" fill="#ffffff"/><image href="${escapeXml(safeLogo)}" x="${qrX + total / 2 - logoSize / 2}" y="${qrY + total / 2 - logoSize / 2}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet"/>`
        : `<image href="${escapeXml(safeLogo)}" x="${logoX}" y="${logoY}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet"/>`
      : "";
    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${viewWidth} ${viewHeight}" role="img" aria-label="Scannable QR code"><rect width="100%" height="100%" fill="#ffffff"/>${frameMarkup}${whiteCodePanel}${cells.join("")}${logoMarkup}</svg>`;
  }, [dots, frame, layout, matrix, safeForeground, safeLogo, logoPlacement, showLogo]);

  const imageHref = useMemo(() => svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : "", [svg]);

  function saveBlob(blob: Blob, filename: string) {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  function downloadSvg() {
    if (!svg) return;
    saveBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), "profile-qr.svg");
  }

  async function downloadPng() {
    if (!svg || !layout) return;
    // Rasterize the code without external assets first. SVGs can refer to a
    // remote logo that taints a canvas and makes otherwise-valid PNG export fail.
    const qrOnlySvg = svg
      .replace(/<image\b[^>]*(?:\/>|><\/image>)/g, "")
      .replace(/<rect x="[^"]+" y="[^"]+" width="[^"]+" height="[^"]+" rx="[^"]+" fill="#ffffff"\/>/g, "");
    const pngScale = 24;
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(layout.viewWidth * pngScale);
    canvas.height = Math.ceil(layout.viewHeight * pngScale);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    const qrImage = new Image();
    const svgUrl = URL.createObjectURL(new Blob([qrOnlySvg], { type: "image/svg+xml;charset=utf-8" }));
    try {
      await new Promise<void>((resolve, reject) => {
        qrImage.onload = () => resolve();
        qrImage.onerror = () => reject(new Error("Could not render QR image"));
        qrImage.src = svgUrl;
      });
      context.drawImage(qrImage, 0, 0, canvas.width, canvas.height);
      if (showLogo && safeLogo) {
        const logo = new Image();
        logo.crossOrigin = "anonymous";
        try {
          await new Promise<void>((resolve, reject) => {
            logo.onload = () => resolve();
            logo.onerror = () => reject(new Error("Could not load logo"));
            logo.src = safeLogo;
          });
          const x = layout.logoX * pngScale;
          const y = layout.logoY * pngScale;
          const width = layout.logoSize * pngScale;
          const height = layout.logoSize * pngScale;
          if (logoPlacement === "center") {
            const centerX = (layout.qrX + layout.total / 2) * pngScale;
            const centerY = (layout.qrY + layout.total / 2) * pngScale;
            context.fillStyle = "#ffffff";
            context.fillRect(centerX - width * 0.72, centerY - height * 0.72, width * 1.44, height * 1.44);
            context.drawImage(logo, centerX - width / 2, centerY - height / 2, width, height);
          } else {
            context.drawImage(logo, x, y, width, height);
          }
        } catch {
          // A cross-origin logo must never prevent a valid, scannable PNG export.
        }
      }
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (blob) saveBlob(blob, "profile-qr.png");
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  }

  if (!path) return null;
  const content = imageHref
    ? <img src={imageHref} alt="Scannable QR code to this approved profile" className="h-full w-full object-contain" />
    : <div className="h-full w-full animate-pulse rounded-xl bg-slate-100" />;

  if (compact) {
    return <div className="profile-qr-compact mx-auto mt-4 h-16 w-16 rounded-lg bg-white p-1" aria-label="Scannable profile QR code">{content}</div>;
  }

  return <div className="profile-qr-print mt-4 rounded-2xl border border-slate-200 bg-white p-3 text-center">
    <div className="mx-auto max-w-[208px] bg-white p-2">{content}</div>
    <p className="mt-2 break-all text-[10px] text-slate-500">{target}</p>
    <div className="mt-3 flex flex-wrap justify-center gap-2">
      <button type="button" disabled={!imageHref} onClick={downloadSvg} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-50">{downloadLabel} · SVG</button>
      <button type="button" disabled={!imageHref} onClick={() => void downloadPng()} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-50">{downloadLabel} · PNG</button>
      <button type="button" disabled={!imageHref} onClick={() => window.print()} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-50">{printLabel}</button>
    </div>
    <style jsx global>{`@media print { body * { visibility: hidden !important; } .profile-qr-print, .profile-qr-print * { visibility: visible !important; } .profile-qr-print { position: fixed !important; left: 50% !important; top: 50% !important; transform: translate(-50%, -50%) !important; width: 3in !important; border: 0 !important; padding: 0.15in !important; } .profile-qr-print button, .profile-qr-print p { display: none !important; } .profile-qr-compact { display: none !important; } }`}</style>
  </div>;
}
