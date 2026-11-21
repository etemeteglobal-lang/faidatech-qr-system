"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useI18n } from "@/i18n/LocaleProvider";

type SharedService = { id: string; serviceType: string; slug: string; title: string; summary: string | null; supportedLocales: string[]; published: boolean; cacheTtlSeconds: number };
type Session = { organization?: { slug: string } };
type Envelope<T> = { data?: T; error?: { message?: string } };
const types = ["HERITAGE_GUIDE", "HOSPITALITY_MENU", "WIFI_WAYFINDING", "GOVERNMENT_GUIDE", "PUBLIC_TRANSPORT", "EVENT_GUIDE", "EDUCATION_LIBRARY", "PUBLIC_HEALTH"];
const defaultPayload = JSON.stringify({ blocks: [{ type: "text", title: "About this service", text: "Add the visitor-facing content here." }], localizedContent: { en: { title: "", summary: "", blocks: [] } } }, null, 2);

export default function SharedServicesWorkspace() {
  const { t } = useI18n();
  const [services, setServices] = useState<SharedService[]>([]);
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [serviceType, setServiceType] = useState(types[0]);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [payload, setPayload] = useState(defaultPayload);
  const [cacheTtlSeconds, setCacheTtlSeconds] = useState("60");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [serviceResponse, sessionResponse] = await Promise.all([fetch("/api/shared-services", { cache: "no-store" }), fetch("/api/auth/session", { cache: "no-store" })]);
    const servicesBody = await serviceResponse.json() as Envelope<SharedService[]>;
    const sessionBody = await sessionResponse.json() as Envelope<Session>;
    if (!serviceResponse.ok || !servicesBody.data) throw new Error(servicesBody.error?.message ?? "Could not load shared services.");
    setServices(servicesBody.data); setOrganizationSlug(sessionBody.data?.organization?.slug ?? "");
  }, []);
  useEffect(() => { void load().catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Could not load shared services.")); }, [load]);

  async function createService(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const content = JSON.parse(payload) as { localizedContent?: Record<string, unknown> };
      const supportedLocales = ["en", ...Object.keys(content.localizedContent ?? {}).filter((code) => code !== "en")];
      const response = await fetch("/api/shared-services", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ serviceType, slug, title, summary: summary || undefined, supportedLocales, payload: content, cacheTtlSeconds: Number(cacheTtlSeconds) }) });
      const body = await response.json() as Envelope<SharedService>;
      if (!response.ok) throw new Error(body.error?.message ?? "Shared service could not be created.");
      setMessage("Shared service draft created."); setSlug(""); setTitle(""); setSummary(""); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Check the payload and try again."); }
    finally { setBusy(false); }
  }

  async function publish(service: SharedService) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/shared-services/${encodeURIComponent(service.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ published: !service.published, cacheTtlSeconds: service.cacheTtlSeconds }) });
      const body = await response.json() as Envelope<SharedService>;
      if (!response.ok) throw new Error(body.error?.message ?? "Publish status could not be changed.");
      setMessage(service.published ? "Service unpublished." : "Service published."); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not change publish status."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-6"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-800">FaidATech · Public QR services</p><h1 className="mt-2 text-2xl font-bold">Shared services</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{t("ecosystem.description")} Keep each payload under 128 KiB; images and audio use stable HTTPS URLs and load lazily in the visitor view. Public cache TTL is capped at 300 seconds.</p></section>
    <section className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"><form onSubmit={createService} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Create shared-service draft</h2><label className="block text-sm font-medium">Service type<select value={serviceType} onChange={(event) => setServiceType(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3">{types.map((type) => <option key={type}>{type}</option>)}</select></label><label className="block text-sm font-medium">URL slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={120} value={slug} onChange={(event) => setSlug(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3" /></label><label className="block text-sm font-medium">Title<input required maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3" /></label><label className="block text-sm font-medium">Summary<input maxLength={500} value={summary} onChange={(event) => setSummary(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3" /></label><label className="block text-sm font-medium">Cache TTL (seconds, 0–300)<input type="number" min="0" max="300" value={cacheTtlSeconds} onChange={(event) => setCacheTtlSeconds(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3" /></label><label className="block text-sm font-medium">Content blocks / locale overrides (JSON)<textarea rows={8} spellCheck={false} value={payload} onChange={(event) => setPayload(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3 font-mono text-xs" /></label><p className="text-xs text-slate-500">Add overrides in <code>localizedContent</code> keyed by locale code; declare each matching code in the payload. Use text/audio/image/link blocks with stable HTTPS media URLs.</p><button disabled={busy} className="rounded-xl bg-faida-green px-4 py-2.5 text-sm font-bold disabled:opacity-50">Create draft</button></form>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Your shared services</h2><div className="mt-4 space-y-3">{services.map((service) => { const publicPath = `/s/${encodeURIComponent(organizationSlug)}/${encodeURIComponent(service.slug)}`; const qrPath = `/api/public-services/${encodeURIComponent(organizationSlug)}/${encodeURIComponent(service.slug)}/qr.svg`; return <article key={service.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{service.title}</h3><p className="mt-1 text-xs text-slate-500">{service.serviceType} · /s/{organizationSlug}/{service.slug}</p>{service.summary ? <p className="mt-2 text-sm text-slate-600">{service.summary}</p> : null}</div><span className={`rounded-full px-3 py-1 text-xs font-bold ${service.published ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{service.published ? "Published" : "Draft"}</span></div><div className="mt-3 flex flex-wrap gap-2">{service.published ? <><a target="_blank" rel="noreferrer" href={publicPath} className="rounded-lg border px-3 py-1.5 text-xs font-semibold">Open public view</a><a href={qrPath} download={`${service.slug}.svg`} className="rounded-lg border px-3 py-1.5 text-xs font-semibold">Download QR SVG</a></> : null}<button disabled={busy} onClick={() => void publish(service)} className="rounded-lg bg-teal-800 px-3 py-1.5 text-xs font-semibold text-white">{service.published ? "Unpublish" : "Publish"}</button></div></article>; })}{!services.length ? <p className="text-sm text-slate-500">No shared service drafts yet.</p> : null}</div></section></section>
    {message ? <p role="status" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">{message}</p> : null}
  </div>;
}
