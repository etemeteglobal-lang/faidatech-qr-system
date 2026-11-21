"use client";

import { useEffect, useState } from "react";
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
      {service ? <a href={`/api/public-services/${encodeURIComponent(organizationSlug)}/${encodeURIComponent(slug)}/qr.svg`} download={`${slug}.svg`} className="mt-8 flex min-h-12 items-center justify-center rounded-xl bg-faida-green px-4 py-3 text-sm font-bold text-faida-navy">{t("common.downloadSvg")}</a> : null}
      <footer className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-950">{t("shared.scanToOpen")} · {t("shared.offlineHint")}</footer>
    </article>
  </main>;
}
