"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { isQrForegroundContrastSafe } from "@/lib/qr/brand";
import type { WizardForm } from "@/components/dashboard/wizard/model";
import { getSectorShowcaseLabels, profileFieldTypes, sectorOptions } from "@/lib/profile/sectors";
import { useI18n } from "@/i18n/LocaleProvider";
import AnnouncementItemsEditor from "@/components/dashboard/wizard/AnnouncementItemsEditor";
import { createUploadProgress, uploadProfileFile, type UploadedProfileFile, type UploadProgressState } from "@/lib/profile/upload";
import UploadProgressFeedback from "@/components/dashboard/wizard/UploadProgressFeedback";

type Props = { form: WizardForm; setFormAction: (next: WizardForm) => void };

function TextInput({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return <label className="block text-sm font-semibold text-slate-700"><span>{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal text-faida-navy outline-none focus:border-faida-teal focus:ring-4 focus:ring-teal-50" /></label>;
}

function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="block text-sm font-semibold text-slate-700"><span>{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={4} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal leading-6 text-faida-navy outline-none focus:border-faida-teal focus:ring-4 focus:ring-teal-50" /></label>;
}

function QrColorControl({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div className="grid grid-cols-[3rem_minmax(0,1fr)] items-end gap-2">
    <TextInput label={label} value={value} onChange={onChange} type="color" />
    <TextInput label="Hex value" value={value} onChange={(next) => /^#[0-9a-fA-F]{6}$/.test(next) && onChange(next.toUpperCase())} placeholder="#0F172A" />
  </div>;
}

function LiveProfileQr({ form }: Props) {
  const { t } = useI18n();
  const [dataUrl, setDataUrl] = useState("");
  useEffect(() => {
    let active = true;
    try {
      const matrix = QRCode.create(`${window.location.origin}/dashboard/create?pillar=profiles`, { errorCorrectionLevel: "H" }).modules;
      const size = 240;
      const quiet = 4;
      const unit = size / (matrix.size + quiet * 2);
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas unavailable");
      const bodyColor = isQrForegroundContrastSafe(form.branding.qrForeground) ? form.branding.qrForeground : "#0F172A";
      const eyeColor = isQrForegroundContrastSafe(form.profile.qrEyeColor) ? form.profile.qrEyeColor : "#0F172A";
      context.fillStyle = form.profile.qrPageBackground;
      context.fillRect(0, 0, size, size);
      context.fillStyle = "#FFFFFF";
      context.fillRect(quiet * unit, quiet * unit, matrix.size * unit, matrix.size * unit);
      context.fillStyle = bodyColor;
      for (let row = 0; row < matrix.size; row += 1) {
        for (let col = 0; col < matrix.size; col += 1) {
          if (!matrix.get(row, col)) continue;
          const x = (col + quiet) * unit;
          const y = (row + quiet) * unit;
          const finder = (col < 8 && row < 8) || (col >= matrix.size - 8 && row < 8) || (col < 8 && row >= matrix.size - 8);
          if (finder) {
            context.fillStyle = eyeColor;
            context.fillRect(x, y, unit + 0.1, unit + 0.1);
            context.fillStyle = bodyColor;
          } else if (["round", "circle"].includes(form.profile.qrDots)) {
            context.beginPath();
            context.arc(x + unit / 2, y + unit / 2, unit * 0.46, 0, Math.PI * 2);
            context.fill();
          } else if (form.profile.qrDots === "diamond") {
            context.save();
            context.translate(x + unit / 2, y + unit / 2);
            context.rotate(Math.PI / 4);
            context.fillRect(-unit * 0.32, -unit * 0.32, unit * 0.64, unit * 0.64);
            context.restore();
          } else if (form.profile.qrDots === "heart") {
            context.save();
            context.translate(x + unit / 2, y + unit / 2);
            context.scale(unit * 0.45, unit * 0.45);
            context.beginPath();
            context.moveTo(0, 0.8);
            context.bezierCurveTo(-0.15, 0.62, -1, 0.05, -1, -0.45);
            context.bezierCurveTo(-1, -1.05, -0.2, -1.1, 0, -0.55);
            context.bezierCurveTo(0.2, -1.1, 1, -1.05, 1, -0.45);
            context.bezierCurveTo(1, 0.05, 0.15, 0.62, 0, 0.8);
            context.fill();
            context.restore();
          } else if (form.profile.qrDots === "line") {
            context.fillRect(x, y + unit * 0.34, unit + 0.1, unit * 0.32);
          } else context.fillRect(x, y, unit + 0.1, unit + 0.1);
        }
      }
      const image = canvas.toDataURL("image/png");
      if (active) setDataUrl(image);
    } catch {
      if (active) setDataUrl("");
    }
    return () => { active = false; };
  }, [form.branding.qrForeground, form.profile.qrEyeColor, form.profile.qrPageBackground, form.profile.qrDots]);

  const frameClass = {
    none: "border border-transparent",
    square: "border-2 border-slate-700",
    rounded: "rounded-2xl border border-slate-300",
    badge: "rounded-[30px] border-2 border-emerald-700 shadow-md",
    circle: "rounded-full border-2 border-emerald-700",
    brand: "rounded-[2rem] border-4 border-faida-navy shadow-lg",
  }[form.profile.qrFrame] ?? "border border-transparent";
  const logoAbove = form.profile.qrLogoPlacement === "above" && form.branding.logoUrl;
  const logoCenter = form.profile.qrLogoPlacement === "center" && form.branding.logoUrl;

  const safeEyeColor = isQrForegroundContrastSafe(form.profile.qrEyeColor) ? form.profile.qrEyeColor : "#0F172A";
  const bodyColorSafe = isQrForegroundContrastSafe(form.branding.qrForeground);
  const eyeColorSafe = isQrForegroundContrastSafe(form.profile.qrEyeColor);

  return <section className="rounded-2xl border border-slate-200 p-4" aria-label={t("profile.qrPreview")}>
    <h3 className="text-sm font-semibold text-faida-navy">{t("profile.qrPreview")}</h3>
    <p className="mt-1 text-xs text-slate-600">{t("profile.qrPreviewNote")}</p>
    <div className="mx-auto mt-4 flex w-fit max-w-full flex-col items-center p-5" style={{ backgroundColor: form.profile.qrPageBackground }}>
      <div className={`flex flex-col items-center p-4 ${frameClass}`} style={{ backgroundColor: form.profile.qrPageBackground, borderColor: safeEyeColor }}>
        {logoAbove ? <img src={form.branding.logoUrl} alt="" className="mb-3 h-9 w-9 rounded-lg bg-white object-contain p-1" /> : null}
        <div className="relative h-48 w-48 overflow-hidden bg-white p-2 shadow-sm">
          {dataUrl ? <img src={dataUrl} alt={t("profile.qrPreview")} className="h-full w-full object-contain" /> : <span className="grid h-full place-items-center text-xs text-slate-500">QR preview</span>}
          {logoCenter ? <span className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-xl bg-white p-1.5 shadow"><img src={form.branding.logoUrl} alt="" className="max-h-full max-w-full object-contain" /></span> : null}
        </div>
        {form.profile.qrFrame === "badge" ? <p className="mt-2 text-center text-xs font-bold" style={{ color: safeEyeColor }}>Scan to view profile</p> : null}
      </div>
      <p className="mt-3 max-w-[17rem] break-all text-center text-[11px] font-medium text-slate-700">Page {form.profile.qrPageBackground} · modules {form.branding.qrForeground} · eyes/frame {form.profile.qrEyeColor} · {form.profile.qrDots} · {form.profile.qrFrame} · logo {form.profile.qrLogoPlacement}</p>
    </div>
    {!bodyColorSafe || !eyeColorSafe ? <p role="alert" className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">QR body and eye/frame colors must have at least 4.5:1 contrast against white.</p> : null}
  </section>;
}

type ProfileUploadRunner = (key: string, file: File, replaceUrl: string | undefined, onComplete: (result: UploadedProfileFile) => void) => Promise<void>;
type StepAttachment = { url: string; fileName: string; mimeType: string; fileSizeBytes?: number };
function StepSubItemFiles({ projectIndex, stepIndex, childIndex, attachments, uploadStates, onUpload, onRemove }: { projectIndex: number; stepIndex: number; childIndex: number; attachments: StepAttachment[]; uploadStates: Record<string, UploadProgressState>; onUpload: (files: File[], replaceIndex?: number) => void; onRemove: (index: number) => void }) {
  const keyPrefix = `project-${projectIndex}-step-${stepIndex}-child-${childIndex}-file-`;
  return <div className="mt-2 space-y-2">
    <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold">Add files<input type="file" multiple accept="application/pdf,image/png,image/jpeg,image/webp" onChange={(event) => { const files = Array.from(event.currentTarget.files ?? []); if (files.length) onUpload(files); event.currentTarget.value = ""; }} className="sr-only" /></label>
    {Object.entries(uploadStates).filter(([key, state]) => key.startsWith(keyPrefix) && state.status === "uploading").map(([key, state]) => <UploadProgressFeedback key={key} state={state} />)}
    {attachments.map((file, fileIndex) => {
      const progressKey = `${keyPrefix}${fileIndex}-${file.fileName}`;
      const progress = uploadStates[progressKey] ?? { status: "completed" as const, fileName: file.fileName, percentage: 100, uploadedBytes: file.fileSizeBytes ?? 0, totalBytes: file.fileSizeBytes ?? 0 };
      const image = file.mimeType.startsWith("image/");
      return <div key={`${file.url}-${fileIndex}`} className="rounded-lg border border-slate-200 bg-white p-2">
        <UploadProgressFeedback state={progress} />
        {image ? <img src={file.url} alt={file.fileName} className="mt-2 max-h-32 rounded object-contain" /> : <a href={file.url} target="_blank" rel="noreferrer" className="mt-2 block break-all text-xs font-semibold text-emerald-800 underline">Open {file.fileName}</a>}
        <div className="mt-2 flex gap-2"><label className="cursor-pointer rounded border px-2 py-1 text-[11px] font-semibold">Replace<input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={(event) => { const replacement = event.currentTarget.files?.[0]; if (replacement) onUpload([replacement], fileIndex); event.currentTarget.value = ""; }} className="sr-only" /></label><button type="button" onClick={() => onRemove(fileIndex)} className="rounded border px-2 py-1 text-[11px] font-semibold text-rose-700">Delete</button></div>
      </div>;
    })}
  </div>;
}

function ShowcaseEditor({ form, update, uploadStates, runUpload, uploadProjectImage, uploadStepChildFiles, removeStepChildFile }: { form: WizardForm; update: (next: Partial<WizardForm["profile"]>) => void; uploadStates: Record<string, UploadProgressState>; runUpload: ProfileUploadRunner; uploadProjectImage: (index: number, file: File, stepIndex?: number) => void; uploadStepChildFiles: (index: number, stepIndex: number, childIndex: number, files: File[], replaceIndex?: number) => void; removeStepChildFile: (index: number, stepIndex: number, childIndex: number, fileIndex: number) => void }) {
  const { t } = useI18n();
  const profile = form.profile;
  const mode = profile.showcaseMode;
  const sectorDefault: Record<string, WizardForm["profile"]["showcaseMode"]> = {
    RETAIL_COMMERCE: "PRODUCT_CATALOG", MANUFACTURING: "PRODUCT_CATALOG", AGRICULTURE: "PRODUCT_CATALOG", FOOD_BEVERAGE: "PRODUCT_CATALOG",
    CONSTRUCTION: "PROJECT_PROCESS", NONPROFIT: "PROJECT_PROCESS", GOVERNMENT: "PROJECT_PROCESS", MEDIA_CREATIVE: "PROJECT_PROCESS", ARTS_CULTURE: "PROJECT_PROCESS", SCIENCE_RESEARCH: "PROJECT_PROCESS",
  };
  const defaultMode = sectorDefault[profile.sector] || "SERVICE_MENU";
  const labels = getSectorShowcaseLabels(profile.sector, mode, profile.customSectorName);
  const modes = ["PRODUCT_CATALOG", "SERVICE_MENU", "PROJECT_PROCESS"] as const;
  function uploadImage(file: File, kind: "product" | "service", index: number) {
    const key = `${kind}-${index}`;
    const replaceUrl = kind === "product" ? profile.products[index]?.imageUrl : profile.services[index]?.imageUrl;
    void runUpload(key, file, replaceUrl, (row) => {
      if (kind === "product") update({ products: profile.products.map((item, i) => i === index ? { ...item, imageUrl: row.url } : item) });
      else update({ services: profile.services.map((item, i) => i === index ? { ...item, imageUrl: row.url } : item) });
    });
  }
  function addProductVariant(productIndex: number) {
    update({ products: profile.products.map((item, index) => index === productIndex ? { ...item, variants: [...item.variants, { title: "", description: "", imageUrl: "", link: "", attachments: [] }] } : item) });
  }
  function updateProductVariant(productIndex: number, variantIndex: number, fields: Partial<WizardForm["profile"]["products"][number]["variants"][number]>) {
    update({ products: profile.products.map((item, index) => index === productIndex ? { ...item, variants: item.variants.map((variant, childIndex) => childIndex === variantIndex ? { ...variant, ...fields } : variant) } : item) });
  }
  function removeProductVariant(productIndex: number, variantIndex: number) {
    update({ products: profile.products.map((item, index) => index === productIndex ? { ...item, variants: item.variants.filter((_, childIndex) => childIndex !== variantIndex) } : item) });
  }
  function uploadVariantImage(file: File, productIndex: number, variantIndex: number) {
    const replaceUrl = profile.products[productIndex]?.variants[variantIndex]?.imageUrl;
    void runUpload(`product-${productIndex}-variant-${variantIndex}`, file, replaceUrl, (row) => updateProductVariant(productIndex, variantIndex, { imageUrl: row.url }));
  }
  async function uploadVariantFiles(files: File[], productIndex: number, variantIndex: number, replaceIndex?: number) {
    const variant = profile.products[productIndex]?.variants[variantIndex];
    if (!variant) return;
    const uploadedFiles: StepAttachment[] = [];
    for (const file of files) {
      const target = replaceIndex === undefined ? variant.attachments.length + uploadedFiles.length : replaceIndex;
      await runUpload(`product-${productIndex}-variant-${variantIndex}-file-${target}-${file.name}`, file, variant.attachments[target]?.url, (row) => {
        uploadedFiles.push({ url: row.url, fileName: row.fileName, mimeType: row.mimeType, fileSizeBytes: row.fileSizeBytes });
      });
    }
    if (!uploadedFiles.length) return;
    updateProductVariant(productIndex, variantIndex, { attachments: replaceIndex === undefined ? [...variant.attachments, ...uploadedFiles] : variant.attachments.map((file, i) => i === replaceIndex ? uploadedFiles[0] : file) });
  }
  return <section id="profile-projects" className="scroll-mt-24 space-y-4 rounded-2xl border border-slate-200 p-4">
    <div><h3 className="font-semibold text-faida-navy">{labels.sectionTitle}</h3><p className="mt-1 text-xs text-faida-slate">{t("profile.projectsNote")}</p></div>
    <label className="block text-sm font-semibold text-slate-700"><span>Showcase type</span><select value={mode} onChange={(e) => update({ showcaseMode: e.target.value as typeof mode })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"><option value="PRODUCT_CATALOG">Products / retail catalog</option><option value="SERVICE_MENU">Services / menu / packages</option><option value="PROJECT_PROCESS">Projects / process steps</option></select><span className="mt-1 block text-xs font-normal text-slate-500">Suggested for this sector: {defaultMode === "PRODUCT_CATALOG" ? "products" : defaultMode === "SERVICE_MENU" ? "services or menu" : "projects"}. You can change this at any time.</span></label>
    {mode === "PRODUCT_CATALOG" ? <div className="space-y-3">
      <button type="button" onClick={() => update({ products: [...profile.products, { name: "", description: "", imageUrl: "", price: "", currency: "ETB", availability: "AVAILABLE", variants: [] }] })} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold">{labels.addParentLabel}</button>
      {profile.products.map((item, index) => <div key={index} className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
        <TextInput label={labels.parentTitleLabel} value={item.name} onChange={(name) => update({ products: profile.products.map((row, i) => i === index ? { ...row, name } : row) })} />
        <TextInput label="Price" type="number" value={item.price} onChange={(price) => update({ products: profile.products.map((row, i) => i === index ? { ...row, price } : row) })} />
        <TextInput label="Currency (e.g. ETB)" value={item.currency} onChange={(currency) => update({ products: profile.products.map((row, i) => i === index ? { ...row, currency } : row) })} />
        <label className="block text-sm font-semibold text-slate-700">Availability<select value={item.availability} onChange={(e) => update({ products: profile.products.map((row, i) => i === index ? { ...row, availability: e.target.value as typeof row.availability } : row) })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"><option value="AVAILABLE">Available</option><option value="OUT_OF_STOCK">Out of stock</option><option value="PREORDER">Pre-order</option><option value="BY_REQUEST">By request</option></select></label>
        <TextArea label={labels.parentDescriptionLabel} value={item.description} onChange={(description) => update({ products: profile.products.map((row, i) => i === index ? { ...row, description } : row) })} />
        <label className="block text-sm font-semibold">{labels.parentImageLabel}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadImage(file, "product", index); }} className="mt-1 block w-full text-xs" /><UploadProgressFeedback state={uploadStates[`product-${index}`]} />{item.imageUrl ? <><img src={item.imageUrl} alt="" className="mt-2 h-40 w-full rounded-lg object-cover" /><button type="button" onClick={() => update({ products: profile.products.map((row, i) => i === index ? { ...row, imageUrl: "" } : row) })} className="mt-1 text-xs font-semibold text-rose-700">Remove image</button></> : null}</label>
        <button type="button" onClick={() => update({ products: profile.products.filter((_, i) => i !== index) })} className="text-left text-xs font-semibold text-red-700">{labels.removeParentLabel}</button>
        <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-3"><h4 className="text-sm font-semibold text-faida-navy">{labels.childPlural}</h4><button type="button" onClick={() => addProductVariant(index)} className="rounded-lg border px-2 py-1 text-xs font-semibold">{labels.addChildLabel}</button></div>
          {item.variants.length ? <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 touch-pan-x">{item.variants.map((variant, variantIndex) => <article key={variantIndex} className="w-72 shrink-0 snap-start rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-bold text-teal-800">{labels.childSingular} {variantIndex + 1}</p>
            <TextInput label={labels.childTitleLabel} value={variant.title} onChange={(title) => updateProductVariant(index, variantIndex, { title })} />
            <TextArea label={labels.childDescriptionLabel} value={variant.description} onChange={(description) => updateProductVariant(index, variantIndex, { description })} />
            <TextInput label="External submission URL (optional)" type="url" value={variant.link} onChange={(link) => updateProductVariant(index, variantIndex, { link })} placeholder="https://forms.example.com/…" />
            <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2"><p className="text-xs font-semibold">Attachments</p><label className="mt-2 inline-flex cursor-pointer rounded border px-2 py-1 text-xs font-semibold">Add files<input type="file" multiple accept="application/pdf,image/png,image/jpeg,image/webp" onChange={(e) => { const files = Array.from(e.target.files ?? []); if (files.length) void uploadVariantFiles(files, index, variantIndex); e.currentTarget.value = ""; }} className="sr-only" /></label>{variant.attachments.map((file, fileIndex) => { const key = `product-${index}-variant-${variantIndex}-file-${fileIndex}-${file.fileName}`; const progress = uploadStates[key] ?? { status: "completed" as const, fileName: file.fileName, percentage: 100, uploadedBytes: file.fileSizeBytes ?? 0, totalBytes: file.fileSizeBytes ?? 0 }; return <div key={`${file.url}-${fileIndex}`} className="mt-2 rounded border p-2"><UploadProgressFeedback state={progress} />{file.mimeType.startsWith("image/") ? <img src={file.url} alt={file.fileName} className="mt-2 max-h-28 rounded object-contain" /> : <a href={file.url} target="_blank" rel="noreferrer" className="mt-1 block break-all text-xs text-emerald-800 underline">Open {file.fileName}</a>}<div className="mt-1 flex gap-2"><label className="cursor-pointer rounded border px-2 py-1 text-[11px]">Replace<input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={(e) => { const replacement = e.currentTarget.files?.[0]; if (replacement) void uploadVariantFiles([replacement], index, variantIndex, fileIndex); e.currentTarget.value = ""; }} className="sr-only" /></label><button type="button" onClick={() => updateProductVariant(index, variantIndex, { attachments: variant.attachments.filter((_, i) => i !== fileIndex) })} className="rounded border px-2 py-1 text-[11px] text-rose-700">Delete</button></div></div>; })}{Object.entries(uploadStates).filter(([key, state]) => key.startsWith(`product-${index}-variant-${variantIndex}-file-`) && state.status === "uploading").map(([key, state]) => <UploadProgressFeedback key={key} state={state} />)}</div>
            <label className="mt-2 block text-xs font-semibold">{labels.childImageLabel}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadVariantImage(file, index, variantIndex); }} className="mt-1 block w-full" /><UploadProgressFeedback state={uploadStates[`product-${index}-variant-${variantIndex}`]} />{variant.imageUrl ? <><img src={variant.imageUrl} alt="" className="mt-2 h-36 w-full rounded-lg object-cover" /><button type="button" onClick={() => updateProductVariant(index, variantIndex, { imageUrl: "" })} className="mt-1 text-xs font-semibold text-rose-700">Remove image</button></> : null}</label>
            <button type="button" onClick={() => removeProductVariant(index, variantIndex)} className="mt-2 text-xs font-semibold text-red-700">Remove {labels.childSingular.toLowerCase()}</button>
          </article>)}</div> : <p className="mt-2 text-xs text-slate-500">Add options such as a dress size, color, or shoe style.</p>}
        </div>
      </div>)}
    </div> : null}
    {mode === "SERVICE_MENU" ? <div className="space-y-3">
      <button type="button" onClick={() => update({ services: [...profile.services, { name: "", description: "", imageUrl: "", price: "", currency: "ETB", duration: "" }] })} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold">{labels.addParentLabel}</button>
      {profile.services.map((item, index) => <div key={index} className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
        <TextInput label={labels.parentTitleLabel} value={item.name} onChange={(name) => update({ services: profile.services.map((row, i) => i === index ? { ...row, name } : row) })} />
        <TextInput label="Price / rate" type="number" value={item.price} onChange={(price) => update({ services: profile.services.map((row, i) => i === index ? { ...row, price } : row) })} />
        <TextInput label="Currency" value={item.currency} onChange={(currency) => update({ services: profile.services.map((row, i) => i === index ? { ...row, currency } : row) })} />
        <TextInput label="Duration (optional)" value={item.duration} onChange={(duration) => update({ services: profile.services.map((row, i) => i === index ? { ...row, duration } : row) })} />
        <TextArea label={labels.parentDescriptionLabel} value={item.description} onChange={(description) => update({ services: profile.services.map((row, i) => i === index ? { ...row, description } : row) })} />
        <label className="block text-sm font-semibold">{labels.parentImageLabel}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadImage(file, "service", index); }} className="mt-1 block w-full text-xs" /><UploadProgressFeedback state={uploadStates[`service-${index}`]} />{item.imageUrl ? <><img src={item.imageUrl} alt="" className="mt-2 h-40 w-full rounded-lg object-cover" /><button type="button" onClick={() => update({ services: profile.services.map((row, i) => i === index ? { ...row, imageUrl: "" } : row) })} className="mt-1 text-xs font-semibold text-rose-700">Remove image</button></> : null}</label>
        <button type="button" onClick={() => update({ services: profile.services.filter((_, i) => i !== index) })} className="text-left text-xs font-semibold text-red-700">{labels.removeParentLabel}</button>
      </div>)}
    </div> : null}
    {mode === "PROJECT_PROCESS" ? <><div className="flex items-center justify-between"><p className="text-xs text-slate-500">{t("profile.projectsNote")}</p><button type="button" onClick={() => update({ projects: [...profile.projects, { title: "", description: "", url: "", imageUrl: "", steps: [] }] })} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold">{labels.addParentLabel}</button></div>{profile.projects.map((item, index) => <div key={index} className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
      <TextInput label={labels.parentTitleLabel} value={item.title} onChange={(value) => update({ projects: profile.projects.map((row, i) => i === index ? { ...row, title: value } : row) })} />
      <TextInput label={t("profile.url")} value={item.url} onChange={(url) => update({ projects: profile.projects.map((row, i) => i === index ? { ...row, url } : row) })} type="url" />
      <TextArea label={labels.parentDescriptionLabel} value={item.description} onChange={(value) => update({ projects: profile.projects.map((row, i) => i === index ? { ...row, description: value } : row) })} />
      <label className="block text-sm font-semibold">{labels.parentImageLabel}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadProjectImage(index, file); }} className="mt-1 block w-full text-xs" /><UploadProgressFeedback state={uploadStates[`project-${index}-cover`]} />{item.imageUrl ? <><img src={item.imageUrl} alt="" className="mt-2 h-40 w-full rounded-lg object-cover" /><button type="button" onClick={() => update({ projects: profile.projects.map((row, i) => i === index ? { ...row, imageUrl: "" } : row) })} className="mt-1 text-xs font-semibold text-rose-700">Remove image</button></> : null}</label>
      <div className="sm:col-span-2"><div className="flex items-center justify-between"><h4 className="text-sm font-semibold">{labels.childPlural}</h4><button type="button" onClick={() => update({ projects: profile.projects.map((row, i) => i === index ? { ...row, steps: [...row.steps, { title: "", description: "", imageUrl: "", children: [] }] } : row) })} className="rounded-lg border px-2 py-1 text-xs font-semibold">{labels.addChildLabel}</button></div>
        <div className="mt-2 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 touch-pan-x">{item.steps.map((step, stepIndex) => <article key={stepIndex} className="w-72 shrink-0 snap-start rounded-xl border bg-white p-3"><p className="text-xs font-bold text-teal-800">{labels.childSingular} {stepIndex + 1}</p><TextInput label={labels.childTitleLabel} value={step.title} onChange={(title) => update({ projects: profile.projects.map((row, i) => i === index ? { ...row, steps: row.steps.map((entry, j) => j === stepIndex ? { ...entry, title } : entry) } : row) })} /><TextArea label={labels.childDescriptionLabel} value={step.description} onChange={(description) => update({ projects: profile.projects.map((row, i) => i === index ? { ...row, steps: row.steps.map((entry, j) => j === stepIndex ? { ...entry, description } : entry) } : row) })} /><label className="mt-2 block text-xs font-semibold">{labels.childImageLabel}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadProjectImage(index, file, stepIndex); }} className="mt-1 block w-full" /><UploadProgressFeedback state={uploadStates[`project-${index}-step-${stepIndex}`]} />{step.imageUrl ? <><img src={step.imageUrl} alt="" className="mt-2 h-36 w-full rounded object-cover" /><button type="button" onClick={() => update({ projects: profile.projects.map((row, i) => i !== index ? row : { ...row, steps: row.steps.map((entry, j) => j === stepIndex ? { ...entry, imageUrl: "" } : entry) }) })} className="mt-1 text-xs font-semibold text-rose-700">Remove image</button></> : null}</label><div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="flex items-center justify-between gap-2"><h5 className="text-xs font-bold">Step sub-items / attachments</h5><button type="button" onClick={() => update({ projects: profile.projects.map((row, i) => i !== index ? row : { ...row, steps: row.steps.map((entry, j) => j !== stepIndex ? entry : { ...entry, children: [...(entry.children ?? []), { title: "", description: "", attachments: [] }] }) }) })} className="rounded-lg border px-2 py-1 text-xs font-semibold">Add sub-item</button></div>{(step.children ?? []).map((child, childIndex) => <div key={childIndex} className="mt-2 rounded-lg border bg-white p-2"><TextInput label="Sub-item title" value={child.title} onChange={(title) => update({ projects: profile.projects.map((row, i) => i !== index ? row : { ...row, steps: row.steps.map((entry, j) => j !== stepIndex ? entry : { ...entry, children: entry.children.map((value, k) => k === childIndex ? { ...value, title } : value) }) }) })} /><TextArea label="Sub-item details" value={child.description} onChange={(description) => update({ projects: profile.projects.map((row, i) => i !== index ? row : { ...row, steps: row.steps.map((entry, j) => j !== stepIndex ? entry : { ...entry, children: entry.children.map((value, k) => k === childIndex ? { ...value, description } : value) }) }) })} /><StepSubItemFiles projectIndex={index} stepIndex={stepIndex} childIndex={childIndex} attachments={child.attachments} uploadStates={uploadStates} onUpload={(files, replaceIndex) => uploadStepChildFiles(index, stepIndex, childIndex, files, replaceIndex)} onRemove={(fileIndex) => removeStepChildFile(index, stepIndex, childIndex, fileIndex)} /></div>)}</div></article>)}</div>
      </div><button type="button" onClick={() => update({ projects: profile.projects.filter((_, i) => i !== index) })} className="text-left text-xs font-semibold text-red-700">{labels.removeParentLabel}</button></div>)}</> : null}

  </section>;
}

export default function SectorProfileEditor({ form, setFormAction }: Props) {
  const { t } = useI18n();
  const profile = form.profile;
  const update = (next: Partial<WizardForm["profile"]>) => setFormAction({ ...form, profile: { ...profile, ...next } });
  const [uploadStates, setUploadStates] = useState<Record<string, UploadProgressState>>({});

  async function runProfileUpload(key: string, file: File, replaceUrl: string | undefined, onComplete: (result: UploadedProfileFile) => void) {
    let progress = createUploadProgress(file, "uploading");
    setUploadStates((current) => ({ ...current, [key]: progress }));
    try {
      const result = await uploadProfileFile(file, (transfer) => {
        progress = { ...progress, ...transfer, status: "uploading" };
        setUploadStates((current) => ({ ...current, [key]: progress }));
      }, replaceUrl);
      onComplete(result);
      progress = { ...progress, status: "completed", percentage: 100, uploadedBytes: file.size, totalBytes: file.size };
    } catch (error) {
      progress = { ...progress, status: "failed", error: error instanceof Error ? error.message : t("profile.uploadError") };
    }
    setUploadStates((current) => ({ ...current, [key]: progress }));
  }

  function uploadLogo(file: File) {
    void runProfileUpload("logo", file, form.branding.logoUrl, (result) => setFormAction({ ...form, branding: { ...form.branding, logoUrl: result.url } }));
  }

  function uploadAboutImage(file: File) {
    void runProfileUpload("about", file, profile.aboutImageUrl, (result) => update({ aboutImageUrl: result.url }));
  }

  async function uploadStepChildFiles(index: number, stepIndex: number, childIndex: number, files: File[], replaceIndex?: number) {
    const currentChild = profile.projects[index]?.steps[stepIndex]?.children[childIndex];
    if (!currentChild) return;
    const uploadedFiles: StepAttachment[] = [];
    for (const file of files) {
      const targetIndex = replaceIndex === undefined ? currentChild.attachments.length + uploadedFiles.length : replaceIndex;
      await runProfileUpload(`project-${index}-step-${stepIndex}-child-${childIndex}-file-${targetIndex}-${file.name}`, file, currentChild.attachments[targetIndex]?.url, (uploaded) => {
        uploadedFiles.push({ url: uploaded.url, fileName: uploaded.fileName, mimeType: uploaded.mimeType, fileSizeBytes: uploaded.fileSizeBytes });
      });
    }
    if (!uploadedFiles.length) return;
    update({ projects: profile.projects.map((row, projectIndex) => projectIndex !== index ? row : {
      ...row,
      steps: row.steps.map((step, currentStepIndex) => currentStepIndex !== stepIndex ? step : {
        ...step,
        children: step.children.map((child, currentChildIndex) => currentChildIndex !== childIndex ? child : {
          ...child,
          attachments: replaceIndex === undefined ? [...child.attachments, ...uploadedFiles] : child.attachments.map((file, fileIndex) => fileIndex === replaceIndex ? uploadedFiles[0] : file),
        }),
      }),
    }) });
  }
  function removeStepChildFile(index: number, stepIndex: number, childIndex: number, fileIndex: number) {
    update({ projects: profile.projects.map((row, projectIndex) => projectIndex !== index ? row : {
      ...row,
      steps: row.steps.map((step, currentStepIndex) => currentStepIndex !== stepIndex ? step : {
        ...step,
        children: step.children.map((child, currentChildIndex) => currentChildIndex !== childIndex ? child : {
          ...child,
          attachments: child.attachments.filter((_, currentFileIndex) => currentFileIndex !== fileIndex),
        }),
      }),
    }) });
  }

  function uploadProjectImage(index: number, file: File, stepIndex?: number) {
    const key = stepIndex === undefined ? `project-${index}-cover` : `project-${index}-step-${stepIndex}`;
    const replaceUrl = stepIndex === undefined ? profile.projects[index]?.imageUrl : profile.projects[index]?.steps[stepIndex]?.imageUrl;
    void runProfileUpload(key, file, replaceUrl, (result) => {
      update({ projects: profile.projects.map((project, i) => i !== index ? project : stepIndex === undefined ? { ...project, imageUrl: result.url } : { ...project, steps: project.steps.map((step, j) => j === stepIndex ? { ...step, imageUrl: result.url } : step) }) });
    });
  }

  function uploadCredential(index: number, file: File) {
    void runProfileUpload(`credential-${index}`, file, profile.credentials[index]?.fileUrl, (result) => update({ credentials: profile.credentials.map((item, row) => row === index ? { ...item, fileUrl: result.url, fileName: result.fileName, mimeType: result.mimeType } : item) }));
  }

  const sections = [
    ["profile-identity", t("profile.builder.identity")], ["profile-about", t("profile.builder.about")],
    ["profile-news", t("profile.builder.news")], ["profile-contact", t("profile.builder.contact")],
    ["profile-projects", t("profile.builder.projects")], ["profile-qr-style", t("profile.builder.qr")],
  ] as const;

  return <div className="space-y-6">
    <nav aria-label={t("profile.builder.navigation")} className="sticky top-2 z-20 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">{sections.map(([id, label]) => <a key={id} href={`#${id}`} className="shrink-0 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-900">{label}</a>)}</nav>
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4"><p className="text-sm font-bold text-emerald-950">{t("profile.guidedTitle")}</p><p className="mt-1 text-xs leading-5 text-emerald-900">{t("profile.guidedNote")}</p></div>
    <section id="profile-identity" className="scroll-mt-24 rounded-2xl border border-slate-200 p-4"><h3 className="mb-4 font-semibold text-faida-navy">{t("profile.builder.identity")}</h3><div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm font-semibold text-slate-700 sm:col-span-2"><span>{t("profile.entityType")}</span><select value={profile.entityType} onChange={(event) => update({ entityType: event.target.value as typeof profile.entityType })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm">{(["INDIVIDUAL", "ORGANIZATION", "GROUP", "GOVERNANCE"] as const).map((kind) => <option key={kind} value={kind}>{kind === "INDIVIDUAL" ? t("profile.entityIndividual") : kind === "ORGANIZATION" ? t("profile.entityOrganization") : kind === "GROUP" ? t("profile.entityGroup") : t("profile.entityGovernance")}</option>)}</select></label>
      <label className="block text-sm font-semibold text-slate-700 sm:col-span-2"><span>{t("profile.sector")}</span><select value={profile.sector} onChange={(event) => { const sector = event.target.value as typeof profile.sector; const mode = ["RETAIL_COMMERCE", "MANUFACTURING", "AGRICULTURE", "FOOD_BEVERAGE"].includes(sector) ? "PRODUCT_CATALOG" : ["CONSTRUCTION", "GOVERNMENT", "NONPROFIT", "MEDIA_CREATIVE", "ARTS_CULTURE", "SCIENCE_RESEARCH"].includes(sector) ? "PROJECT_PROCESS" : sector === "OTHER" ? "PROJECT_PROCESS" : "SERVICE_MENU"; update({ sector, showcaseMode: mode }); }} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-faida-navy outline-none focus:border-faida-teal">{sectorOptions.map((sector) => <option key={sector.id} value={sector.id}>{sector.label}</option>)}</select></label>
      {profile.sector === "OTHER" ? <TextInput label={t("profile.customSectorName")} value={profile.customSectorName} onChange={(value) => update({ customSectorName: value })} placeholder={t("profile.customSectorPlaceholder")} /> : null}
      {profile.entityType === "INDIVIDUAL" ? <><TextInput label={t("profile.firstName")} value={profile.firstName} onChange={(value) => update({ firstName: value })} /><TextInput label={t("profile.lastName")} value={profile.lastName} onChange={(value) => update({ lastName: value })} /><TextInput label={t("profile.role")} value={profile.role} onChange={(value) => update({ role: value })} placeholder={t("profile.rolePlaceholder")} /><TextInput label={t("profile.organization")} value={profile.organization} onChange={(value) => update({ organization: value })} /></> : <><TextInput label={t(`profile.entity.name.${profile.entityType.toLowerCase()}` as never)} value={profile.organization} onChange={(value) => update({ organization: value })} /><TextInput label={t("profile.sector")} value={profile.sector === "OTHER" ? profile.customSectorName : sectorOptions.find((item) => item.id === profile.sector)?.label ?? ""} onChange={() => {}} /></>}
      {profile.entityType === "GOVERNANCE" ? <><TextInput label={t("profile.mandate")} value={profile.mandate} onChange={(value) => update({ mandate: value })} /><TextInput label={t("profile.jurisdiction")} value={profile.jurisdiction} onChange={(value) => update({ jurisdiction: value })} /></> : null}
      {profile.entityType === "GROUP" ? <><TextInput label={t("profile.leadership")} value={profile.leadership} onChange={(value) => update({ leadership: value })} /><TextInput label={t("profile.members")} value={profile.members} onChange={(value) => update({ members: value })} /></> : null}
      <TextInput label={t("profile.tagline")} value={profile.tagline} onChange={(value) => update({ tagline: value })} placeholder={t("profile.taglinePlaceholder")} />
    </div></section>

    <section id="profile-about" className="scroll-mt-24 space-y-4 rounded-2xl border border-slate-200 p-4"><h3 className="font-semibold text-faida-navy">{t("profile.builder.about")}</h3><TextArea label={t("profile.bio")} value={profile.bio} onChange={(value) => update({ bio: value })} placeholder={t("profile.bioPlaceholder")} /><label className="block text-sm font-semibold text-slate-700"><span>Key Highlights / Service Badges (one per line)</span><textarea value={profile.highlights.join("\n")} onChange={(event) => update({ highlights: event.target.value.split("\n").slice(0, 12) })} rows={3} maxLength={1000} placeholder="Locally owned\nSame-day service\nLicensed professionals" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal" /></label><label className="block text-sm font-semibold text-slate-700"><span>{t("profile.aboutImage")}</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAboutImage(file); }} className="mt-2 block w-full text-xs" /><UploadProgressFeedback state={uploadStates.about} /></label>{profile.aboutImageUrl ? <div><img src={profile.aboutImageUrl} alt={t("profile.aboutImage")} className="h-36 w-full rounded-xl object-cover" /><button type="button" onClick={() => update({ aboutImageUrl: "" })} className="mt-1 text-xs font-semibold text-rose-700">Remove image</button></div> : null}</section>

    <section id="profile-news" className="scroll-mt-24 space-y-4 rounded-2xl border border-slate-200 p-4">
      <h3 className="font-semibold text-faida-navy">{t("profile.builder.news")}</h3>
      <AnnouncementItemsEditor announcements={profile.announcements} onChange={(announcements) => setFormAction({ ...form, profile: { ...form.profile, announcements } })} />
    </section>

    <section id="profile-contact" className="scroll-mt-24 space-y-4 rounded-2xl border border-slate-200 p-4"><h3 className="font-semibold text-faida-navy">{t("profile.contactTitle")}</h3><div className="grid gap-4 sm:grid-cols-2"><TextInput label={t("profile.phone")} value={profile.phone} onChange={(value) => update({ phone: value })} type="tel" /><TextInput label={t("profile.email")} value={profile.email} onChange={(value) => update({ email: value })} type="email" /><TextInput label="Opening hours" value={profile.hours} onChange={(value) => update({ hours: value })} placeholder="Mon–Fri, 9:00–17:00" /><TextInput label={t("profile.website")} value={profile.website} onChange={(value) => update({ website: value })} type="url" /><TextInput label={t("profile.address")} value={profile.address} onChange={(value) => update({ address: value })} /><TextInput label={t("profile.mapUrl")} value={profile.mapUrl} onChange={(value) => update({ mapUrl: value })} type="url" /></div></section>

    <section className="space-y-4 rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold text-faida-navy">{t("profile.logoTitle")}</h3><p className="mt-1 text-xs text-faida-slate">{t("profile.uploadNote")}</p></div><label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-faida-navy">{t("profile.uploadLogo")}<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadLogo(file); }} /></label><UploadProgressFeedback state={uploadStates.logo} /></div>{form.branding.logoUrl ? <><img src={form.branding.logoUrl} alt="" className="h-16 w-16 rounded-xl border border-slate-200 bg-white object-contain p-1" /><button type="button" onClick={() => setFormAction({ ...form, branding: { ...form.branding, logoUrl: "" } })} className="text-xs font-semibold text-rose-700">Remove logo</button></> : null}</section>

    <section className="scroll-mt-24 space-y-4 rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between"><h3 className="font-semibold text-faida-navy">{t("profile.socialTitle")}</h3><button type="button" onClick={() => update({ socialLinks: [...profile.socialLinks, { platform: "LinkedIn", label: "", url: "", avatarUrl: "" }] })} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold">+ {t("profile.addItem")}</button></div>{profile.socialLinks.map((item, index) => <div key={index} className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-[.7fr_1fr_1.5fr_auto]"><TextInput label={t("profile.platform")} value={item.platform} onChange={(value) => update({ socialLinks: profile.socialLinks.map((row, i) => i === index ? { ...row, platform: value } : row) })} /><TextInput label={t("profile.label")} value={item.label} onChange={(value) => update({ socialLinks: profile.socialLinks.map((row, i) => i === index ? { ...row, label: value } : row) })} /><TextInput label={t("profile.url")} value={item.url} onChange={(value) => update({ socialLinks: profile.socialLinks.map((row, i) => i === index ? { ...row, url: value } : row) })} type="url" /><TextInput label="Profile photo URL" value={item.avatarUrl || ""} onChange={(value) => update({ socialLinks: profile.socialLinks.map((row, i) => i === index ? { ...row, avatarUrl: value } : row) })} type="url" /><button type="button" aria-label={t("profile.removeItem")} onClick={() => update({ socialLinks: profile.socialLinks.filter((_, i) => i !== index) })} className="self-end rounded-lg px-2 py-2 text-slate-500">×</button></div>)}</section>

    <ShowcaseEditor form={form} update={update} uploadStates={uploadStates} runUpload={runProfileUpload} uploadProjectImage={uploadProjectImage} uploadStepChildFiles={uploadStepChildFiles} removeStepChildFile={removeStepChildFile} />
    <section className="space-y-4 rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between"><div><h3 className="font-semibold text-faida-navy">{t("profile.credentialsTitle")}</h3><p className="mt-1 text-xs text-faida-slate">{t("profile.credentialsNote")}</p></div><button type="button" onClick={() => update({ credentials: [...profile.credentials, { title: "", issuer: "", year: "", fileUrl: "", fileName: "", mimeType: "application/pdf" }] })} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold">+ {t("profile.addItem")}</button></div>{profile.credentials.map((item, index) => <div key={index} className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2"><TextInput label={t("profile.credentialTitle")} value={item.title} onChange={(value) => update({ credentials: profile.credentials.map((row, i) => i === index ? { ...row, title: value } : row) })} /><TextInput label={t("profile.issuer")} value={item.issuer} onChange={(value) => update({ credentials: profile.credentials.map((row, i) => i === index ? { ...row, issuer: value } : row) })} /><TextInput label={t("profile.year")} value={item.year} onChange={(value) => update({ credentials: profile.credentials.map((row, i) => i === index ? { ...row, year: value } : row) })} /><label className="block text-sm font-semibold text-slate-700"><span>{t("profile.file")}</span><input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadCredential(index, file); }} className="mt-1.5 block w-full text-xs" /><UploadProgressFeedback state={uploadStates[`credential-${index}`]} />{item.fileName ? <a href={item.fileUrl} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs text-emerald-800 underline">Open {item.fileName}</a> : null}</label><button type="button" onClick={() => update({ credentials: profile.credentials.filter((_, i) => i !== index) })} className="text-left text-xs font-semibold text-rose-700">Remove credential</button></div>)}</section>

    <section className="space-y-4 rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between"><h3 className="font-semibold text-faida-navy">{t("profile.customFieldsTitle")}</h3><button type="button" onClick={() => update({ customFields: [...profile.customFields, { id: `field-${Date.now()}`, label: "", type: "text", value: "" }] })} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold">+ {t("profile.addItem")}</button></div>{profile.customFields.map((item, index) => <div key={item.id} className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-3"><TextInput label={t("profile.fieldLabel")} value={item.label} onChange={(value) => update({ customFields: profile.customFields.map((row, i) => i === index ? { ...row, label: value } : row) })} /><label className="block text-sm font-semibold text-slate-700"><span>{t("profile.fieldType")}</span><select value={item.type} onChange={(event) => update({ customFields: profile.customFields.map((row, i) => i === index ? { ...row, type: event.target.value as typeof row.type } : row) })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">{profileFieldTypes.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}</select></label><TextInput label={t("profile.fieldValue")} value={item.value} onChange={(value) => update({ customFields: profile.customFields.map((row, i) => i === index ? { ...row, value } : row) })} /></div>)}</section>

    <section className="space-y-4 rounded-2xl border border-slate-200 p-4"><h3 className="font-semibold text-faida-navy">{t("profile.visibilityTitle")}</h3><div className="grid gap-2 sm:grid-cols-2">{(Object.keys(profile.sectionVisibility) as (keyof typeof profile.sectionVisibility)[]).map((key) => <label key={key} className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={profile.sectionVisibility[key]} onChange={(event) => update({ sectionVisibility: { ...profile.sectionVisibility, [key]: event.target.checked } })} className="h-4 w-4 accent-emerald-700" />{t(`profile.visibility.${key}` as never)}</label>)}</div></section>

    <section id="profile-qr-style" className="scroll-mt-24 space-y-4 rounded-2xl border border-slate-200 p-4">
      <h3 className="font-semibold text-faida-navy">{t("profile.qrStyleTitle")}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <QrColorControl label={t("profile.qrBackground")} value={profile.qrPageBackground} onChange={(value) => update({ qrPageBackground: value.toUpperCase() })} />
        <QrColorControl label="QR body / modules color" value={form.branding.qrForeground} onChange={(value) => setFormAction({ ...form, branding: { ...form.branding, qrForeground: value.toUpperCase() } })} />
        <QrColorControl label="QR eyes / frame accent color" value={profile.qrEyeColor} onChange={(value) => update({ qrEyeColor: value.toUpperCase() })} />
        <label className="block text-sm font-semibold text-slate-700"><span>{t("profile.qrFrame")}</span><select value={profile.qrFrame} onChange={(event) => update({ qrFrame: event.target.value as typeof profile.qrFrame })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="none">{t("profile.qrFrameNone")}</option><option value="square">{t("profile.qrFrameSquare")}</option><option value="rounded">{t("profile.qrFrameRounded")}</option><option value="badge">{t("profile.qrFrameBadge")}</option><option value="circle">Circle</option><option value="brand">Brand frame</option></select></label>
        <label className="block text-sm font-semibold text-slate-700"><span>{t("profile.qrDots")}</span><select value={profile.qrDots} onChange={(event) => update({ qrDots: event.target.value as typeof profile.qrDots })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="square">{t("profile.qrDotsSquare")}</option><option value="round">{t("profile.qrDotsRound")}</option><option value="circle">Circle</option><option value="diamond">Diamond</option><option value="heart">Heart</option><option value="line">Line / Bars</option></select></label>
        <label className="block text-sm font-semibold text-slate-700"><span>{t("profile.qrLogoPlacement")}</span><select value={profile.qrLogoPlacement} onChange={(event) => update({ qrLogoPlacement: event.target.value as typeof profile.qrLogoPlacement })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="none">{t("profile.qrLogoNone")}</option><option value="center">{t("profile.qrLogoCenter")}</option><option value="above">{t("profile.qrLogoAbove")}</option></select></label>
      </div>
    </section>
    <LiveProfileQr form={form} setFormAction={setFormAction} />
  </div>;
}
