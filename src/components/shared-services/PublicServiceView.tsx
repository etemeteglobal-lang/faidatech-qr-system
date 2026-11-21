"use client";

import { useEffect, useState, type FormEvent } from "react";
import LanguageSelector from "@/i18n/LanguageSelector";
import { useI18n } from "@/i18n/LocaleProvider";
import ServiceWorkerRegister from "@/components/shared-services/ServiceWorkerRegister";

type ServiceBlock = { type: "text" | "image" | "audio" | "link"; title?: string; text?: string; url?: string; caption?: string };
type ServiceData = { serviceType: string; title: string; summary: string | null; supportedLocales: string[]; payload: Record<string, unknown> };
function safeHttps(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try { const parsed = new URL(value); return parsed.protocol === "https:" ? parsed.toString() : null; } catch { return null; }
}
function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export default function PublicServiceView({ organizationSlug, slug }: { organizationSlug: string; slug: string }) {
  const { t, locale } = useI18n();
  const [service, setService] = useState<ServiceData | null>(null);
  const [error, setError] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    let active = true;
    fetch(`/api/public-services/${encodeURIComponent(organizationSlug)}/${encodeURIComponent(slug)}`)
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok || !body.data) throw new Error(t("shared.loadError"));
        if (active) setService(body.data as ServiceData);
      }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : t("shared.loadError")); });
    return () => { active = false; };
  }, [organizationSlug, slug, t]);
  const localized = asObject(service?.payload.localizedContent);
  const selected = service?.supportedLocales.includes(locale) ? asObject(localized?.[locale]) : null;
  const displayTitle = typeof selected?.title === "string" && selected.title ? selected.title : service?.title;
  const displaySummary = typeof selected?.summary === "string" ? selected.summary : service?.summary;
  const contentBlocks = selected?.blocks ?? service?.payload.blocks;
  const blocks = Array.isArray(contentBlocks) ? contentBlocks as ServiceBlock[] : [];
  const actionForm = asObject(service?.payload.actionForm);
  async function submitResponse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFormMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch(`/api/public-services/${encodeURIComponent(organizationSlug)}/${encodeURIComponent(slug)}/responses`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.get("name"), email: form.get("email"), phone: form.get("phone"), message: form.get("message"), website: form.get("website") }),
      });
      if (!response.ok) throw new Error(response.status === 429 ? t("pillar.action.tooMany") : t("pillar.action.submitError"));
      formElement.reset();
      setFormMessage(t("pillar.action.submitSuccess"));
    } catch (reason) { setFormMessage(reason instanceof Error ? reason.message : t("pillar.action.submitError")); }
    finally { setSubmitting(false); }
  }
  return <main className="min-h-screen bg-[#f7faf9] px-4 py-8 text-faida-navy sm:py-12">
    <ServiceWorkerRegister />
    <article className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <header className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-teal-800">FaidATech · {service?.serviceType?.replaceAll("_", " ") ?? "Shared service"}</p><h1 className="mt-2 text-2xl font-bold">{displayTitle ?? "Shared service"}</h1>{displaySummary ? <p className="mt-2 text-sm leading-6 text-slate-600">{displaySummary}</p> : null}</div><LanguageSelector compact /></header>
      {error ? <div role="status" className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</div> : null}
      {!service && !error ? <p className="mt-6 text-sm text-slate-500" role="status">{t("common.loading")}</p> : null}
      <div className="mt-6 space-y-5">{blocks.map((block, index) => {
        const url = safeHttps(block.url);
        if (block.type === "image" && url) return <figure key={index}><img src={url} alt={block.caption ?? block.title ?? ""} loading="lazy" decoding="async" className="h-auto max-h-[28rem] w-full rounded-2xl object-cover" />{block.caption ? <figcaption className="mt-2 text-xs text-slate-500">{block.caption}</figcaption> : null}</figure>;
        if (block.type === "audio" && url) return <section key={index}><h2 className="mb-2 font-semibold">{block.title ?? "Audio guide"}</h2><audio controls preload="none" src={url} className="w-full">Audio playback is not supported.</audio></section>;
        if (block.type === "link" && url) return <a key={index} href={url} rel="noopener noreferrer" className="inline-flex rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-bold text-white">{block.title ?? "Open link"}</a>;
        if (block.type === "text" && block.text) return <section key={index}><h2 className="font-semibold">{block.title}</h2><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{block.text}</p></section>;
        return null;
      })}</div>
      {actionForm?.enabled === true ? <section className="mt-8 rounded-2xl border border-teal-100 bg-teal-50/50 p-4 sm:p-5"><h2 className="text-lg font-bold text-faida-navy">{typeof actionForm.prompt === "string" && actionForm.prompt ? actionForm.prompt : t("pillar.action.publicTitle")}</h2><form onSubmit={submitResponse} className="mt-4 space-y-3"><label className="block text-sm font-semibold">{t("pillar.action.name")}<input name="name" autoComplete="name" maxLength={120} required className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal" /></label><div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-semibold">{t("pillar.action.email")}<input type="email" name="email" autoComplete="email" maxLength={254} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal" /></label><label className="block text-sm font-semibold">{t("pillar.action.phone")}<input type="tel" name="phone" autoComplete="tel" maxLength={40} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal" /></label></div><label className="block text-sm font-semibold">{t("pillar.action.message")}<textarea name="message" required maxLength={3000} rows={4} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal" /></label><label aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">Website<input tabIndex={-1} autoComplete="off" name="website" /></label><button disabled={submitting} className="min-h-11 rounded-xl bg-faida-green px-4 py-2.5 text-sm font-bold text-faida-navy disabled:opacity-60">{submitting ? t("pillar.action.sending") : t("pillar.action.send")}</button></form>{formMessage ? <p role="status" className="mt-3 rounded-lg bg-white px-3 py-2 text-sm text-slate-700">{formMessage}</p> : null}<p className="mt-3 text-xs text-slate-500">{t("pillar.action.privacyNote")}</p></section> : null}
      {service ? <a href={`/api/public-services/${encodeURIComponent(organizationSlug)}/${encodeURIComponent(slug)}/qr.svg`} download={`${slug}.svg`} className="mt-8 flex min-h-12 items-center justify-center rounded-xl bg-faida-green px-4 py-3 text-sm font-bold text-faida-navy">{t("common.downloadSvg")}</a> : null}
      <footer className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-950">{t("shared.scanToOpen")} · {t("shared.offlineHint")}</footer>
    </article>
  </main>;
}
