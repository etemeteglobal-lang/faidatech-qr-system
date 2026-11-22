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
};

export default function ProfileQrPreview({ path, foreground, dots, frame, logoUrl, logoPlacement, downloadLabel, printLabel }: Props) {
  const [origin, setOrigin] = useState("");
  const [matrix, setMatrix] = useState<{ size: number; data: Uint8Array } | null>(null);
  const [href, setHref] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const target = origin && path ? `${origin}${path}` : "";
  const safeForeground = /^#[0-9a-fA-F]{6}$/.test(foreground) && isQrForegroundContrastSafe(foreground) ? foreground : "#0F172A";
  useEffect(() => {
    if (!target) { setMatrix(null); return; }
    try { const qr = QRCode.create(target, { errorCorrectionLevel: "H" }); setMatrix({ size: qr.modules.size, data: qr.modules.data }); }
    catch { setMatrix(null); }
  }, [target]);
  const size = matrix?.size ?? 0;
  const total = size + 8;
  const svg = useMemo(() => {
    if (!matrix) return "";
    const scale = dots === "large" ? 1 : dots === "round" ? 0.76 : 0.9;
    const radius = dots === "round" ? scale / 2 : dots === "large" ? 0 : 0.04;
    const offset = (1 - scale) / 2;
    const finder = (x: number, y: number) => (x < 8 && y < 8) || (x >= size - 8 && y < 8) || (x < 8 && y >= size - 8);
    const cells: string[] = [];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (matrix.data[y * size + x]) {
      const square = finder(x, y);
      const moduleScale = square ? 1 : scale;
      const moduleOffset = square ? 0 : offset;
      const moduleRadius = square ? 0 : radius;
      cells.push(`<rect x="${x + 4 + moduleOffset}" y="${y + 4 + moduleOffset}" width="${moduleScale}" height="${moduleScale}" rx="${moduleRadius}" fill="${safeForeground}"/>`);
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" role="img" aria-label="QR code"><rect width="100%" height="100%" fill="#ffffff"/>${cells.join("")}</svg>`;
  }, [safeForeground, matrix, size, total, dots]);
  useEffect(() => { if (svg) setHref(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`); else setHref(""); }, [svg]);
  if (!path) return null;
  const frameClass = frame === "rounded" ? "rounded-[24px]" : frame === "brand" ? "rounded-[28px] border-4 border-teal-800" : "rounded-md";
  function download() {
    if (!svg) return;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "profile-qr.svg"; anchor.click(); URL.revokeObjectURL(url);
  }
  return <div className="profile-qr-print mt-4 rounded-2xl border border-slate-200 bg-white p-3 text-center">
    {logoUrl && logoPlacement === "top" ? <img src={logoUrl} alt="Profile logo" className="mx-auto mb-2 h-9 max-w-24 object-contain" /> : null}
    <div className={`relative mx-auto h-44 w-44 bg-white p-2 ${frameClass}`}>
      {href ? <img src={href} alt="Scannable QR code to this profile" className="h-full w-full" /> : <div className="h-full w-full animate-pulse rounded-xl bg-slate-100" />}
      {logoUrl && logoPlacement === "center" ? <img src={logoUrl} alt="Profile logo" className="absolute left-1/2 top-1/2 h-[18%] w-[18%] -translate-x-1/2 -translate-y-1/2 rounded-md border-2 border-white bg-white object-contain p-0.5" /> : null}
    </div>
    {logoUrl && logoPlacement === "bottom" ? <img src={logoUrl} alt="Profile logo" className="mx-auto mt-2 h-9 max-w-24 object-contain" /> : null}
    <p className="mt-2 break-all text-[10px] text-slate-500">{target}</p>
    <div className="mt-3 flex justify-center gap-2"><button type="button" disabled={!href} onClick={download} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-50">{downloadLabel}</button><button type="button" disabled={!href} onClick={() => window.print()} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-50">{printLabel}</button></div>
    <style jsx global>{`@media print { body * { visibility: hidden !important; } .profile-qr-print, .profile-qr-print * { visibility: visible !important; } .profile-qr-print { position: fixed !important; left: 50% !important; top: 50% !important; transform: translate(-50%, -50%) !important; width: 3in !important; border: 0 !important; } .profile-qr-print button { display: none !important; } }`}</style>
  </div>;
}
