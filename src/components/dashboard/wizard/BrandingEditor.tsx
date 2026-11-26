"use client";

import { useState } from "react";
import type { WizardForm } from "@/components/dashboard/wizard/model";
import { colorContrastRatio, getReadableTextColor, isScanSafeQrForeground } from "@/lib/qr/brand-presentation";
import type { ApiErrorEnvelope } from "@/lib/qr/client-types";
import { useI18n } from "@/i18n/LocaleProvider";
import { localizedApiError } from "@/i18n/api-errors";
import { createUploadProgress, uploadMultipartFile, type UploadProgressState } from "@/lib/profile/upload";
import UploadProgressFeedback from "@/components/dashboard/wizard/UploadProgressFeedback";

type UploadResponse = ApiErrorEnvelope & { data?: { url?: string; key?: string } };

export default function BrandingEditor({ form, setFormAction }: { form: WizardForm; setFormAction: (next: WizardForm) => void }) {
  const { t } = useI18n();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState>(() => createUploadProgress());
  const brand = form.branding;

  async function uploadLogo(file: File | undefined) {
    if (!file) return;
    setUploadError("");
    setUploadMessage("");
    if (file.size > 2 * 1024 * 1024) {
      setUploadError(t("error.uploadTooLarge", { size: "2" }));
      setUploadProgress(createUploadProgress(file, "failed"));
      return;
    }
    setUploading(true);
    let latestProgress = createUploadProgress(file, "uploading");
    setUploadProgress(latestProgress);
    try {
      const response = await uploadMultipartFile<UploadResponse>("/api/assets", file, { fields: brand.logoUrl ? { replaceUrl: brand.logoUrl } : undefined, onProgress: (progress) => {
        latestProgress = { ...latestProgress, ...progress, status: "uploading" };
        setUploadProgress(latestProgress);
      } });
      const result = response.data;
      if (!response.ok || !result.data?.url) throw new Error(localizedApiError(result, "branding.uploadFallback", t));
      setFormAction({ ...form, branding: { ...brand, logoUrl: result.data.url } });
      setUploadMessage(t("branding.uploadSuccess"));
      setUploadProgress({ ...latestProgress, status: "completed", percentage: 100, uploadedBytes: file.size, totalBytes: file.size });
    } catch (reason) {
      setUploadError(reason instanceof Error ? reason.message : t("branding.uploadFallback"));
      setUploadProgress({ ...latestProgress, status: "failed" });
    } finally {
      setUploading(false);
    }
  }

  const qrSafe = isScanSafeQrForeground(brand.qrForeground);
  const accentText = getReadableTextColor(brand.accentColor);

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5" aria-labelledby="brand-identity-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-faida-teal">{t("branding.personalize")}</p>
          <h3 id="brand-identity-title" className="mt-1 text-base font-semibold text-faida-navy">{t("branding.title")}</h3>
          <p className="mt-1 max-w-xl text-xs leading-5 text-faida-slate">{t("branding.description")}</p>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-faida-slate">{t("branding.perQr")}</span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-slate-700">
            <span>{t("branding.name")}</span>
            <input value={brand.brandName} maxLength={120} onChange={(event) => setFormAction({ ...form, branding: { ...brand, brandName: event.target.value } })} placeholder={t("branding.namePlaceholder")} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal text-faida-navy outline-none transition placeholder:text-slate-400 focus:border-faida-teal focus:ring-4 focus:ring-teal-50" />
          </label>

          <div>
            <label className="block text-sm font-semibold text-slate-700" htmlFor="brand-logo-upload">{t("branding.logoUpload")}</label>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <label htmlFor="brand-logo-upload" className="inline-flex cursor-pointer items-center rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-faida-navy shadow-sm transition hover:border-faida-teal hover:bg-teal-50/40 focus-within:ring-4 focus-within:ring-teal-100">{uploading ? t("branding.uploading") : t("branding.uploadLogo")}</label>
              <input id="brand-logo-upload" type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={(event) => { void uploadLogo(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} className="sr-only" />
              {brand.logoUrl ? <button type="button" onClick={() => { setFormAction({ ...form, branding: { ...brand, logoUrl: "" } }); setUploadMessage(""); }} className="rounded-lg px-2 py-2 text-xs font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-700">{t("branding.removeLogo")}</button> : null}
            </div>
            <p className="mt-1.5 text-[11px] leading-5 text-faida-slate">{t("branding.imageRequirements")}</p>
            <UploadProgressFeedback state={uploadProgress} />
            {uploadMessage ? <p role="status" className="mt-1 text-xs font-medium text-emerald-800">{uploadMessage}</p> : null}
            {uploadError ? <p role="alert" className="mt-1 text-xs text-rose-700">{uploadError}</p> : null}
          </div>

          <label className="block text-sm font-semibold text-slate-700">
            <span>{t("branding.hostedLogo")}</span>
            <input type="url" value={brand.logoUrl.startsWith("/manus-storage/") ? "" : brand.logoUrl} onChange={(event) => setFormAction({ ...form, branding: { ...brand, logoUrl: event.target.value } })} placeholder="https://your-site.com/logo.webp" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal text-faida-navy outline-none transition placeholder:text-slate-400 focus:border-faida-teal focus:ring-4 focus:ring-teal-50" />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700">
              <input type="color" aria-label={t("field.brandAccent")} value={brand.accentColor} onChange={(event) => setFormAction({ ...form, branding: { ...brand, accentColor: event.target.value.toUpperCase() } })} className="h-10 w-12 cursor-pointer rounded-lg border-0 bg-transparent p-0" />
              <span><span className="block">{t("branding.accent")}</span><span className="mt-0.5 block font-mono text-[11px] text-faida-slate">{brand.accentColor.toUpperCase()}</span></span>
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700">
              <input type="color" aria-label={t("field.qrForeground")} value={brand.qrForeground} onChange={(event) => setFormAction({ ...form, branding: { ...brand, qrForeground: event.target.value.toUpperCase() } })} className="h-10 w-12 cursor-pointer rounded-lg border-0 bg-transparent p-0" />
              <span><span className="block">{t("branding.qrInk")}</span><span className="mt-0.5 block font-mono text-[11px] text-faida-slate">{brand.qrForeground.toUpperCase()}</span></span>
            </label>
          </div>
          {!qrSafe ? <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">{t("branding.contrastWarning", { current: colorContrastRatio(brand.qrForeground, "#FFFFFF").toFixed(1), minimum: "4.5" })}</p> : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-faida-slate">{t("branding.preview")}</p>
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-100 p-3">
            {brand.logoUrl ? <img src={brand.logoUrl} alt={t("branding.logoPreview")} className="h-11 w-11 rounded-xl border border-slate-100 object-contain p-1" /> : <span className="grid h-11 w-11 place-items-center rounded-xl text-lg font-black" style={{ backgroundColor: brand.accentColor, color: accentText }}>{(brand.brandName.trim().slice(0, 1) || "B").toUpperCase()}</span>}
            <span className="min-w-0"><strong className="block truncate text-sm text-faida-navy">{brand.brandName.trim() || t("preview.defaultBrand")}</strong><span className="mt-0.5 block text-[10px] text-faida-slate">{t("branding.visitorExperience")}</span></span>
          </div>
          <div className="mt-3 rounded-xl bg-slate-50 p-3">
            <div className="mx-auto grid aspect-square w-full max-w-[120px] grid-cols-7 gap-1 rounded-lg bg-white p-2" aria-label="Illustrative QR preview">
              {Array.from({ length: 49 }, (_, index) => <span key={index} className="rounded-[2px]" style={{ backgroundColor: ((index * 17 + Math.floor(index / 7) * 11) % 5 < 2 || [0, 1, 2, 7, 9, 14, 21, 35, 42, 43, 44, 47, 48].includes(index)) ? brand.qrForeground : "transparent" }} />)}
            </div>
            <p className="mt-2 text-center text-[10px] leading-4 text-faida-slate">{t("branding.illustrativeOnly")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
