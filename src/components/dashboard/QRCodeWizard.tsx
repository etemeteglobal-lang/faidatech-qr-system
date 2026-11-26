"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PayloadEditor from "@/components/dashboard/wizard/PayloadEditor";
import BrandingEditor from "@/components/dashboard/wizard/BrandingEditor";
import SectorProfileExperience from "@/components/qr/SectorProfileExperience";
import StorageAllowanceIndicator from "@/components/dashboard/wizard/StorageAllowanceIndicator";
import DashboardPageHeading from "@/components/dashboard/DashboardPageHeading";
import {
  buildDestinationPayload,
  destinationForPurpose,
  emptyWizardForm,
  formFromRecord,
  validateWizardForm,
  type WizardForm,
  type WizardPurpose,
} from "@/components/dashboard/wizard/model";
import type { ApiErrorEnvelope } from "@/lib/qr/client-types";
import { getReadableTextColor } from "@/lib/qr/brand-presentation";
import { useI18n } from "@/i18n/LocaleProvider";
import { localeMetadata } from "@/i18n/registry";
import { localizedOverride, localizedText } from "@/i18n/localized-content";
import { localizedApiError } from "@/i18n/api-errors";

const purposeCards: { id: WizardPurpose; titleKey: "purpose.profile" | "purpose.landing" | "purpose.vcard" | "purpose.menu" | "purpose.tourism" | "purpose.pdf" | "purpose.payments"; summaryKey: "wizard.purposeProfileSummary" | "wizard.purposeLandingSummary" | "wizard.purposeVcardSummary" | "wizard.purposeMenuSummary" | "wizard.purposeTourismSummary" | "wizard.purposePdfSummary" | "wizard.purposePaymentsSummary"; mark: string }[] = [
  { id: "SECTOR_PROFILE", titleKey: "purpose.profile", summaryKey: "wizard.purposeProfileSummary", mark: "01" },
  { id: "LANDING_PAGE", titleKey: "purpose.landing", summaryKey: "wizard.purposeLandingSummary", mark: "WEB" },
  { id: "VCARD", titleKey: "purpose.vcard", summaryKey: "wizard.purposeVcardSummary", mark: "ID" },
  { id: "MENU", titleKey: "purpose.menu", summaryKey: "wizard.purposeMenuSummary", mark: "ETB" },
  { id: "TOURISM_AUDIO", titleKey: "purpose.tourism", summaryKey: "wizard.purposeTourismSummary", mark: "♫" },
  { id: "PDF", titleKey: "purpose.pdf", summaryKey: "wizard.purposePdfSummary", mark: "PDF" },
  { id: "LOCAL_PAYMENTS", titleKey: "purpose.payments", summaryKey: "wizard.purposePaymentsSummary", mark: "↗" },
];

function formatPreviewEtb(value: string, locale: string): string {
  const amount = Number(value);
  if (!value || !Number.isFinite(amount)) return "ETB —";
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: "ETB", maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `ETB ${amount.toFixed(2)}`;
  }
}

type SaveResponse = ApiErrorEnvelope & {
  data?: { id: string; title: string; shortCode: string; destinationType: string };
  redirectUrl?: string;
  qrImageDataUrl?: string;
};

function SectorVisitorPreview({ form, title, description, brandName }: { form: WizardForm; title: string; description: string; brandName: string }) {
  const localizedEntries = Object.entries(form.localizedContent).flatMap(([code, content]) => {
    if (!content) return [];
    const fields = [
      ["Title", content.title],
      ["Brand name", content.displayName],
      ["Description", content.description],
      ["Summary", content.summary],
      ["Body", content.body],
      ["Button label", content.buttonLabel],
    ].filter((entry): entry is [string, string] => typeof entry[1] === "string" && Boolean(entry[1].trim()));
    return fields.length ? [{ code, fields }] : [];
  });
  const previewPayload = buildDestinationPayload(form) as Parameters<typeof SectorProfileExperience>[0]["payload"];

  return <div className="w-full space-y-3 lg:w-[160%] lg:[zoom:0.625]">
    <header className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex min-w-0 items-center gap-3">
        {form.branding.logoUrl ? <img src={form.branding.logoUrl} alt="" className="h-10 w-10 shrink-0 rounded-xl border border-slate-100 bg-white object-contain p-1" /> : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xs font-black" style={{ backgroundColor: form.branding.accentColor, color: getReadableTextColor(form.branding.accentColor) }}>{brandName.slice(0, 1).toUpperCase()}</span>}
        <div className="min-w-0"><p className="truncate text-xs font-bold text-faida-navy">{brandName}</p><p className="mt-0.5 break-words text-sm font-semibold text-slate-700">{title}</p></div>
      </div>
      {description ? <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-faida-slate">{description}</p> : null}
    </header>
    <div className="pointer-events-none">
      <SectorProfileExperience payload={previewPayload} shortCode="preview" previewMode />
    </div>
    {localizedEntries.length ? <section className="rounded-2xl border border-violet-100 bg-violet-50/60 p-3">
      <h3 className="text-xs font-bold text-violet-950">Localized visitor text</h3>
      <div className="mt-2 space-y-3">{localizedEntries.map(({ code, fields }) => <div key={code} className="rounded-xl bg-white p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-violet-800">{localeMetadata[code as keyof typeof localeMetadata]?.nativeName ?? code}</p>
        {fields.map(([label, value]) => <p key={label} className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-slate-700"><span className="font-semibold">{label}: </span>{value}</p>)}
      </div>)}</div>
    </section> : null}
  </div>;
}

function MobilePreview({ form }: { form: WizardForm }) {
  const { locale, t } = useI18n();
  const purpose = form.purpose;
  const purposeCard = purposeCards.find((card) => card.id === purpose);
  const label = purposeCard ? t(purposeCard.titleKey) : t("preview.selectPurpose");
  const copy = localizedOverride(form.localizedContent, locale);
  const title = localizedText(copy.title, form.title.trim() || t("preview.defaultTitle"));
  const initials = `${form.vcard.firstName.slice(0, 1)}${form.vcard.lastName.slice(0, 1)}`.toUpperCase() || "QR";
  const brandName = localizedText(copy.displayName, form.branding.brandName.trim() || t("preview.defaultBrand"));
  const description = localizedText(copy.description, form.description);
  const landingSummary = localizedText(copy.summary, form.landing.summary || form.landing.body || t("preview.story"));
  const landingBody = localizedText(copy.body, form.landing.body);
  const buttonLabel = localizedText(copy.buttonLabel, form.landing.buttonLabel);
  const accent = form.branding.accentColor;
  const accentText = getReadableTextColor(accent);

  return (
    <aside className="flex max-h-[70dvh] min-h-0 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:max-h-[calc(100dvh-7rem)]">
      <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-faida-teal">{t("preview.live")}</p><p className="mt-1 text-xs text-faida-slate">{t("preview.updates")}</p></div><span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-xs font-bold text-faida-slate">↗</span></div>
      <div role="region" aria-label={t("preview.live")} tabIndex={0} className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-faida-teal">
      {purpose === "SECTOR_PROFILE" ? <SectorVisitorPreview form={form} title={title} description={description} brandName={brandName} /> : <div className="mx-auto mt-1 w-full max-w-[292px] rounded-[34px] border-[7px] border-faida-navy bg-faida-navy p-1.5 shadow-xl">
        <div className="overflow-hidden rounded-[25px] bg-[#f7faf9]">
          <div className="flex h-8 items-center justify-center bg-white"><span className="h-1.5 w-14 rounded-full bg-slate-200" /></div>
          <div className="min-h-[410px] px-4 pb-5 pt-4">
            <div className="flex items-center gap-2">{form.branding.logoUrl ? <img src={form.branding.logoUrl} alt="" className="h-7 w-7 rounded-lg border border-slate-100 bg-white object-contain p-0.5" /> : <span className="grid h-7 w-7 place-items-center rounded-lg text-[10px] font-black" style={{ backgroundColor: accent, color: accentText }}>{brandName.slice(0, 1).toUpperCase()}</span>}<span className="max-w-28 truncate text-[10px] font-extrabold text-faida-navy">{brandName}</span><span className="ms-auto max-w-24 truncate text-[9px] text-slate-400">{label}</span></div>
            {description ? <p className="mt-2 line-clamp-2 text-[9px] leading-4 text-faida-slate">{description}</p> : null}
            {purpose === "LANDING_PAGE" ? <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">{form.landing.imageUrl ? <img src={form.landing.imageUrl} alt="" className="h-24 w-full object-cover" /> : <div className="grid h-20 place-items-center text-xs font-bold" style={{ backgroundColor: `${accent}22`, color: "#0F172A" }}>{brandName}</div>}<div className="p-3"><p className="truncate text-sm font-semibold text-faida-navy">{title}</p><p className="mt-1 line-clamp-3 text-[10px] leading-4 text-faida-slate">{landingSummary}</p>{buttonLabel ? <span className="mt-3 inline-flex rounded-lg px-3 py-1.5 text-[9px] font-bold" style={{ backgroundColor: accent, color: accentText }}>{buttonLabel}</span> : null}{landingBody && landingBody !== landingSummary ? <span className="sr-only">{landingBody}</span> : null}</div></div> : null}
            {purpose === "VCARD" ? (
              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="bg-faida-navy px-4 py-5 text-white"><span className="grid h-9 w-9 place-items-center overflow-hidden rounded-xl text-xs font-black" style={{ backgroundColor: accent, color: accentText }}>{form.branding.logoUrl ? <img src={form.branding.logoUrl} alt="" className="h-full w-full object-contain" /> : initials}</span><p className="mt-3 text-[9px] font-bold uppercase tracking-widest" style={{ color: accent }}>{t("preview.businessCard")}</p><p className="mt-1 truncate text-sm font-semibold">{`${form.vcard.firstName} ${form.vcard.lastName}`.trim() || title}</p><p className="mt-1 truncate text-[10px] text-slate-300">{form.vcard.jobTitle || form.vcard.organization || t("preview.contactDetails")}</p></div><div className="space-y-2 p-3">{form.vcard.phone ? <div className="rounded-lg border border-slate-100 px-3 py-2 text-[10px] text-slate-500">{form.vcard.phone}</div> : null}{form.vcard.email ? <div className="truncate rounded-lg border border-slate-100 px-3 py-2 text-[10px] text-slate-500">{form.vcard.email}</div> : null}<div className="rounded-lg px-3 py-2 text-center text-[10px] font-bold" style={{ backgroundColor: accent, color: accentText }}>{t("preview.saveContact")}</div></div></div>
            ) : null}
            {purpose === "MENU" ? (
              <div className="mt-5 space-y-2"><div className="rounded-2xl bg-faida-navy p-4 text-white"><p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: accent }}>{t("preview.todayMenu", { brand: brandName })}</p><p className="mt-1 truncate text-sm font-semibold">{title}</p><p className="mt-2 inline-flex rounded-md bg-white/10 px-2 py-1 text-[9px]">{t("preview.categories")}</p></div>{form.menuItems.slice(0, 2).map((item, index) => <div key={index} className="rounded-xl border border-slate-200 bg-white p-3"><p className="truncate text-[10px] font-semibold text-faida-navy">{item.name || t("preview.menuItem")}</p><p className="mt-1 flex justify-between text-[9px] text-slate-400"><span>{item.category || t("preview.category")}</span><span className="font-bold" style={{ color: accent }}>{formatPreviewEtb(item.priceETB, localeMetadata[locale].formattingLocale)}</span></p></div>)}</div>
            ) : null}
            {purpose === "TOURISM_AUDIO" ? (
              <div className="mt-5 rounded-2xl bg-faida-navy p-4 text-white"><p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: accent }}>{t("preview.audioGuide", { brand: brandName })}</p><p className="mt-1 text-sm font-semibold">{title}</p><div className="mt-3 flex flex-wrap gap-1">{Object.entries(form.audioLinks).filter(([, link]) => link.trim()).map(([code]) => <span key={code} className="rounded-full px-2 py-1 text-[8px]" style={{ backgroundColor: accent, color: accentText }}>{localeMetadata[code as keyof typeof localeMetadata].nativeName}</span>)}</div><div className="mt-4 rounded-xl bg-white/10 p-3"><span className="block text-lg" style={{ color: accent }}>▶</span><span className="mt-1 block text-[9px] text-slate-300">{Object.values(form.audioLinks).some(Boolean) ? t("preview.audioLinked") : t("preview.addAudio")}</span></div><p className="mt-3 truncate text-[9px] text-slate-300">{form.gps.latitude || t("field.latitude")}, {form.gps.longitude || t("field.longitude")}</p></div>
            ) : null}
            {purpose === "PDF" ? <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-xs font-black text-rose-700">PDF</span><p className="mt-4 line-clamp-2 text-sm font-semibold text-faida-navy">{title}</p><p className="mt-1 truncate text-[10px] text-faida-slate">{form.pdf.fileName || t("preview.documentFileName")}</p><div className="mt-4 rounded-lg px-3 py-2 text-center text-[10px] font-bold" style={{ backgroundColor: accent, color: accentText }}>{t("preview.openDocument")}</div></div> : null}
            {purpose === "LOCAL_PAYMENTS" ? <div className="mt-5 rounded-2xl bg-faida-navy p-4 text-white"><span className="grid h-10 w-10 place-items-center rounded-xl text-xl" style={{ backgroundColor: accent, color: accentText }}>↗</span><p className="mt-4 text-sm font-semibold">{title}</p><p className="mt-1 break-all text-[9px] text-slate-300">{form.paymentUrl || t("preview.checkoutUrl")}</p><div className="mt-4 rounded-xl px-3 py-2.5 text-center text-[10px] font-bold" style={{ backgroundColor: accent, color: accentText }}>{t("preview.continuePayment")}</div></div> : null}
            {!purpose ? <div className="mt-5 grid min-h-[260px] place-items-center rounded-2xl border border-dashed border-slate-300 bg-white px-5 text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-xl font-bold text-faida-green">QR</span><p className="mt-4 text-xs font-semibold text-faida-navy">{t("preview.selectPurpose")}</p><p className="mt-1 text-[10px] leading-5 text-faida-slate">{t("preview.visitorAppears")}</p></div></div> : null}
          </div>
          <div className="flex h-6 items-center justify-center bg-white"><span className="h-1 w-16 rounded-full bg-slate-300" /></div>
        </div>
      </div>}
      {purpose !== "SECTOR_PROFILE" ? <p className="mt-4 text-center text-[11px] text-faida-slate">{t("preview.mobileWidth")}</p> : null}
      </div>
    </aside>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean }) {
  return <label className="block text-sm font-semibold text-slate-700"><span>{label}{required ? <span className="ml-1 text-rose-600">*</span> : null}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal text-faida-navy outline-none transition placeholder:text-slate-400 focus:border-faida-teal focus:ring-4 focus:ring-teal-50" /></label>;
}

export default function QRCodeWizard() {
  const { t, direction } = useI18n();
  const [form, setForm] = useState<WizardForm>(emptyWizardForm);
  const [step, setStep] = useState(0);
  const [editId, setEditId] = useState<string | null>(null);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<SaveResponse | null>(null);
  const [showPublicPreview, setShowPublicPreview] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEditId(params.get("edit"));
    if (params.get("pillar") === "profiles" && !params.get("edit")) setForm((current) => ({ ...current, purpose: "SECTOR_PROFILE" }));
  }, []);

  useEffect(() => {
    if (!editId) return;
    let active = true;
    setLoadingRecord(true);
    fetch(`/api/qrcodes/${encodeURIComponent(editId)}`, { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as SaveResponse & { data?: { id: string; title: string; description: string | null; destinationType: string; payload: unknown } };
        if (!response.ok || !body.data) throw new Error(localizedApiError(body, "error.couldNotLoadQrForEdit", t));
        if (active) {
          setForm(formFromRecord(body.data.destinationType, body.data.payload, body.data.title, body.data.description));
          setStep(1);
        }
      })
      .catch(() => { if (active) setError(t("error.couldNotLoadQrForEdit")); })
      .finally(() => { if (active) setLoadingRecord(false); });
    return () => { active = false; };
  }, [editId, t]);

  const selectedPurpose = purposeCards.find((card) => card.id === form.purpose);

  function continueStep() {
    setError("");
    if (step === 0) {
      if (!form.purpose) return setError(t("validation.choosePurpose"));
      setStep(1);
    } else if (step === 1) {
      const issue = validateWizardForm(form);
      if (issue) return setError(`${t(issue.key)} Field: ${issue.field}.`);
      setStep(2);
    }
  }

  async function saveQrCode() {
    const issue = validateWizardForm(form);
    if (issue || !form.purpose) {
      setError(issue ? `${t(issue.key)} Field: ${issue.field}.` : `${t("validation.choosePurpose")} Field: QR details > Destination type.`);
      setStep(1);
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload = buildDestinationPayload(form);
      const destinationType = destinationForPurpose(form.purpose);
      const response = await fetch(editId ? `/api/qrcodes/${encodeURIComponent(editId)}` : "/api/qrcodes", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          destinationType,
          payload,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as SaveResponse;
      if (!response.ok) throw new Error(localizedApiError(body, "error.couldNotSaveQr", t));
      setSuccess(body);
      setStep(3);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("error.couldNotSaveQr"));
    } finally {
      setSaving(false);
    }
  }

  function startOver() {
    setForm(emptyWizardForm());
    setStep(0);
    setEditId(null);
    setSuccess(null);
    setError("");
    window.history.replaceState({}, "", "/dashboard/create");
  }

  const qrCode = success?.data;
  const publicPath = qrCode?.shortCode ? `/r/${encodeURIComponent(qrCode.shortCode)}` : "";

  return (
    <div className="space-y-4">
      <DashboardPageHeading
        eyebrow={t("wizard.builderEyebrow")}
        title={t(editId ? "wizard.editHeader" : "wizard.createHeader")}
        description={t("wizard.headingDescription")}
        action={<div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/qrcodes" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-faida-slate transition hover:border-faida-teal hover:bg-teal-50 hover:text-faida-navy focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-100">
            <span aria-hidden="true">{direction === "rtl" ? "→" : "←"}</span>{t("shell.backTo", { destination: t("shell.qrLibrary") })}
          </Link>
          <button type="button" aria-label="Toggle Public Visitor Preview" aria-pressed={showPublicPreview} aria-controls="public-visitor-preview" onClick={() => setShowPublicPreview((visible) => !visible)} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-faida-teal ${showPublicPreview ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-slate-300 bg-white text-faida-navy hover:bg-slate-50"}`}>
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-current"><path d="M10 3.5c-4.35 0-7.8 3.92-9 6.5 1.2 2.58 4.65 6.5 9 6.5s7.8-3.92 9-6.5c-1.2-2.58-4.65-6.5-9-6.5Zm0 10.5a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /></svg>
            Preview
          </button>
        </div>}
      />

      <div className={`grid items-start gap-5 xl:gap-7 ${showPublicPreview ? "lg:grid-cols-[minmax(0,1fr)_260px] xl:grid-cols-[minmax(0,1fr)_280px]" : "grid-cols-1"}`}>
        <section className="min-w-0 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          {step < 3 ? (
            <div className="mb-6 flex items-center gap-2" aria-label={t("wizard.progress")}>
              {(["wizard.stepPurpose", "wizard.stepDetails", "wizard.stepReview"] as const).map((labelKey, index) => (
                <div key={labelKey} className="flex min-w-0 flex-1 items-center gap-2">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${index <= step ? "bg-faida-green text-faida-navy" : "bg-slate-100 text-slate-400"}`}>{index + 1}</span>
                  <span className={`hidden truncate text-xs font-semibold sm:block ${index === step ? "text-faida-navy" : "text-slate-400"}`}>{t(labelKey)}</span>
                  {index < 2 ? <span className={`h-px flex-1 ${index < step ? "bg-faida-green" : "bg-slate-200"}`} /> : null}
                </div>
              ))}
            </div>
          ) : null}

          {error ? <div role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</div> : null}
          {loadingRecord ? <div className="py-14 text-center text-sm text-faida-slate">{t("wizard.loadingDetails")}</div> : null}

          {!loadingRecord && step === 0 ? (
            <div>
              <div className="mb-4"><h2 className="text-lg font-semibold text-faida-navy">{t("wizard.whatCreating")}</h2><p className="mt-1 text-sm text-faida-slate">{t("wizard.purposeDescription")}</p></div>
              <div className="grid gap-3 sm:grid-cols-2">
                {purposeCards.map((card) => {
                  const active = form.purpose === card.id;
                  return (
                    <button key={card.id} type="button" onClick={() => setForm({ ...form, purpose: card.id })} aria-pressed={active} className={`group rounded-2xl border p-4 text-start transition ${active ? "border-faida-teal bg-teal-50/60 ring-2 ring-teal-100" : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/30"}`}>
                      <div className="flex items-start justify-between gap-3"><span className={`grid h-10 min-w-10 place-items-center rounded-xl px-2 text-xs font-black ${active ? "bg-faida-green text-faida-navy" : "bg-slate-100 text-slate-600 group-hover:bg-emerald-50 group-hover:text-emerald-900"}`}>{card.mark}</span><span className={`mt-1 grid h-5 w-5 place-items-center rounded-full border text-[10px] ${active ? "border-faida-green bg-faida-green text-faida-navy" : "border-slate-300 text-transparent"}`}>✓</span></div>
                      <h3 className="mt-4 font-semibold text-faida-navy">{t(card.titleKey)}</h3><p className="mt-1 text-xs leading-5 text-faida-slate">{t(card.summaryKey)}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {!loadingRecord && step === 1 ? (
            <div className="space-y-6">
              <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-faida-teal">{selectedPurpose ? t(selectedPurpose.titleKey) : t("wizard.destinationDetails")}</p><h2 className="mt-1 text-lg font-semibold text-faida-navy">{t("wizard.contentPrompt")}</h2></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("wizard.qrTitle")} value={form.title} onChange={(value) => setForm({ ...form, title: value })} placeholder={t("wizard.titlePlaceholder")} required />
                <Field label={t("wizard.visitorDescription")} value={form.description} onChange={(value) => setForm({ ...form, description: value })} placeholder={t("wizard.descriptionPlaceholder")} />
              </div>
              <StorageAllowanceIndicator />
              <BrandingEditor form={form} setFormAction={setForm} />
              <PayloadEditor form={form} setFormAction={setForm} />
            </div>
          ) : null}

          {!loadingRecord && step === 2 ? (
            <div className="space-y-5">
              <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-faida-teal">{t("wizard.readyToPublish")}</p><h2 className="mt-1 text-lg font-semibold text-faida-navy">{t("wizard.reviewTitle")}</h2><p className="mt-1 text-sm text-faida-slate">{t("wizard.reviewDescription")}</p></div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-faida-slate">{t("wizard.purposeLabel")}</p><p className="mt-1 font-semibold text-faida-navy">{selectedPurpose ? t(selectedPurpose.titleKey) : "—"}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">{t("wizard.dynamicQr")}</span></div>
                <div className="mt-4 border-t border-slate-200 pt-4"><p className="text-xs font-bold uppercase tracking-widest text-faida-slate">{t("wizard.titleLabel")}</p><p className="mt-1 font-semibold text-faida-navy">{form.title}</p>{form.description ? <p className="mt-1 text-sm leading-6 text-faida-slate">{form.description}</p> : null}</div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-white p-3"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("wizard.shortLink")}</p><p className="mt-1 break-all font-mono text-xs text-faida-navy">/r/[shortCode]</p></div><div className="rounded-xl bg-white p-3"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("wizard.qrImage")}</p><p className="mt-1 text-xs text-faida-navy">{t("wizard.exportsAvailable")}</p></div></div>
              </div>
              <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-4 text-sm leading-6 text-teal-950">{t("wizard.externalUrlNote")}</div>
            </div>
          ) : null}

          {!loadingRecord && step === 3 ? (
            <div className="py-4 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-2xl font-black text-faida-green">✓</span>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-faida-teal">{editId ? t("wizard.changesSaved") : t("wizard.created")}</p>
              <h2 className="mt-2 text-2xl font-semibold text-faida-navy">{qrCode?.title || form.title}</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-faida-slate">{editId ? t("wizard.destinationUpdated") : t("wizard.shortCodeReady")}</p>
              {success?.qrImageDataUrl ? <img src={success.qrImageDataUrl} alt={t("wizard.qrImage")} className="mx-auto mt-5 h-44 w-44 rounded-2xl border border-slate-200 bg-white p-2" /> : null}
              {publicPath ? <a href={publicPath} target="_blank" rel="noreferrer" className="mx-auto mt-4 block max-w-md break-all rounded-xl bg-slate-50 px-4 py-3 font-mono text-xs text-emerald-900 hover:bg-emerald-50">{typeof window !== "undefined" ? new URL(publicPath, window.location.origin).toString() : publicPath}</a> : null}
              <div className="mt-6 flex flex-wrap justify-center gap-2"><Link href="/dashboard/qrcodes" className="rounded-xl bg-faida-green px-4 py-2.5 text-sm font-bold text-faida-navy">{t("wizard.viewCodes")}</Link>{qrCode?.id ? <><a href={`/api/qrcodes/${qrCode.id}/image?format=svg`} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-faida-navy">{t("common.downloadSvg")}</a><a href={`/api/qrcodes/${qrCode.id}/image?format=png`} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-faida-navy">{t("common.downloadPng")}</a></> : null}<button type="button" onClick={startOver} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-faida-slate">{t("wizard.createAnother")}</button></div>
            </div>
          ) : null}

          {!loadingRecord && step < 3 ? (
            <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <button type="button" onClick={() => { setError(""); setStep(Math.max(0, step - 1)); }} disabled={step === 0} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-faida-slate transition hover:bg-slate-50 disabled:invisible">{direction === "rtl" ? "→" : "←"} {t("common.back")}</button>
              {step < 2 ? <button type="button" onClick={continueStep} className="rounded-xl bg-faida-navy px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800">{t("common.continue")} <span aria-hidden="true">{direction === "rtl" ? "←" : "→"}</span></button> : <button type="button" disabled={saving} onClick={() => void saveQrCode()} className="rounded-xl bg-faida-green px-5 py-2.5 text-sm font-bold text-faida-navy transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-60">{saving ? t("wizard.saving") : editId ? t("wizard.saveChanges") : t("wizard.createQrAction")}</button>}
            </div>
          ) : null}
        </section>

        <div id="public-visitor-preview" hidden={!showPublicPreview} className="min-w-0 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:self-start">
          <MobilePreview form={form} />
        </div>
      </div>
    </div>
  );
}
