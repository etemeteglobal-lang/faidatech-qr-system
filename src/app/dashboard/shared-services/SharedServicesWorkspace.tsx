"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useI18n } from "@/i18n/LocaleProvider";
import { localeMetadata, uniqueLocaleCodes } from "@/i18n/registry";
import type { MessageKey } from "@/i18n/messages";

type SharedService = { id: string; serviceType: string; slug: string; title: string; summary: string | null; supportedLocales: string[]; published: boolean; cacheTtlSeconds: number; actionEnabled: boolean };
type ServiceResponse = { id: string; visitorName: string; visitorEmail: string | null; visitorPhone: string | null; message: string; status: string; submittedAt: string };
type Session = { organization?: { slug: string } };
type Envelope<T> = { data?: T; error?: { message?: string } };
const serviceTypes = ["HERITAGE_GUIDE", "HOSPITALITY_MENU", "WIFI_WAYFINDING", "GOVERNMENT_GUIDE", "PUBLIC_TRANSPORT", "EVENT_GUIDE", "EDUCATION_LIBRARY", "PUBLIC_HEALTH"] as const;
const typeKey = (type: string) => `pillar.shared.type.${type}` as MessageKey;

export default function SharedServicesWorkspace({ mode = "shared" }: { mode?: "shared" | "actions" }) {
  const { t, locale } = useI18n();
  const [services, setServices] = useState<SharedService[]>([]);
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [serviceType, setServiceType] = useState<string>(mode === "actions" ? "EVENT_GUIDE" : serviceTypes[0]);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [prompt, setPrompt] = useState("");
  const [allowResponses, setAllowResponses] = useState(mode === "actions");
  const [supportedLocales, setSupportedLocales] = useState<string[]>([locale]);
  const [responseLists, setResponseLists] = useState<Record<string, ServiceResponse[]>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const actionMode = mode === "actions";

  const load = useCallback(async () => {
    const [serviceResponse, sessionResponse] = await Promise.all([fetch("/api/shared-services", { cache: "no-store" }), fetch("/api/auth/session", { cache: "no-store" })]);
    const servicesBody = await serviceResponse.json() as Envelope<SharedService[]>;
    const sessionBody = await sessionResponse.json() as Envelope<Session>;
    if (!serviceResponse.ok || !servicesBody.data) throw new Error(t("pillar.shared.loadError"));
    setServices(servicesBody.data);
    setOrganizationSlug(sessionBody.data?.organization?.slug ?? "");
  }, [t]);

  useEffect(() => { void load().catch((error: unknown) => setMessage(error instanceof Error ? error.message : t("pillar.shared.loadError"))); }, [load, t]);

  async function createService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const trimmedTitle = title.trim();
      const localizedContent = Object.fromEntries(supportedLocales.map((code) => [code, { title: trimmedTitle, summary: summary.trim(), blocks: content.trim() ? [{ type: "text", title: trimmedTitle, text: content.trim() }] : [] }]));
      const payload = {
        blocks: content.trim() ? [{ type: "text", title: trimmedTitle, text: content.trim() }] : [],
        localizedContent,
        ...(allowResponses ? { actionForm: { enabled: true, prompt: prompt.trim() || t("pillar.action.defaultPrompt"), fields: ["name", "email", "phone", "message"] } } : {}),
      };
      const response = await fetch("/api/shared-services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceType, slug, title: trimmedTitle, summary: summary.trim() || undefined, supportedLocales, payload, cacheTtlSeconds: 60 }),
      });
      const body = await response.json() as Envelope<SharedService>;
      if (!response.ok || !body.data) throw new Error(t("pillar.shared.saveError"));
      setMessage(t(actionMode ? "pillar.action.saved" : "pillar.shared.saved"));
      setSlug(""); setTitle(""); setSummary(""); setContent(""); setPrompt("");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : t("pillar.shared.saveError")); }
    finally { setBusy(false); }
  }

  async function publish(service: SharedService) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/shared-services/${encodeURIComponent(service.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ published: !service.published, cacheTtlSeconds: service.cacheTtlSeconds }) });
      const body = await response.json() as Envelope<SharedService>;
      if (!response.ok) throw new Error(t("pillar.shared.publishError"));
      setMessage(service.published ? t("pillar.shared.unpublished") : t("pillar.shared.published"));
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : t("pillar.shared.publishError")); }
    finally { setBusy(false); }
  }

  async function loadResponses(service: SharedService) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/shared-services/${encodeURIComponent(service.id)}/responses`, { cache: "no-store" });
      const body = await response.json() as Envelope<ServiceResponse[]>;
      if (!response.ok || !body.data) throw new Error(t("pillar.action.inboxError"));
      setResponseLists((current) => ({ ...current, [service.id]: body.data! }));
    } catch (error) { setMessage(error instanceof Error ? error.message : t("pillar.action.inboxError")); }
    finally { setBusy(false); }
  }

  async function updateResponse(serviceId: string, responseId: string, status: "READ" | "RESOLVED") {
    setBusy(true);
    try {
      const response = await fetch(`/api/shared-services/${encodeURIComponent(serviceId)}/responses/${encodeURIComponent(responseId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      if (!response.ok) throw new Error(t("pillar.action.inboxError"));
      await loadResponses(services.find((service) => service.id === serviceId)!);
    } catch (error) { setMessage(error instanceof Error ? error.message : t("pillar.action.inboxError")); }
    finally { setBusy(false); }
  }

  function toggleLocale(code: string) {
    setSupportedLocales((current) => current.includes(code) ? current.length === 1 ? current : current.filter((value) => value !== code) : [...current, code]);
  }

  const listed = services.filter((service) => actionMode ? service.actionEnabled : true);
  return <div className="space-y-6">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-800">{t(actionMode ? "pillar.action.eyebrow" : "pillar.shared.eyebrow")}</p>
      <h2 className="mt-2 text-2xl font-bold text-faida-navy">{t(actionMode ? "pillar.action.title" : "pillar.shared.title")}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{t(actionMode ? "pillar.action.description" : "pillar.shared.description")}</p>
    </section>
    <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <form onSubmit={createService} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold text-faida-navy">{t(actionMode ? "pillar.action.formTitle" : "pillar.shared.formTitle")}</h3>
        <label className="block text-sm font-semibold text-slate-700">{t("pillar.shared.typeLabel")}<select value={serviceType} onChange={(event) => setServiceType(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3">{serviceTypes.map((type) => <option key={type} value={type}>{t(typeKey(type))}</option>)}</select></label>
        <label className="block text-sm font-semibold text-slate-700">{t("pillar.shared.urlName")}<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={120} value={slug} onChange={(event) => setSlug(event.target.value)} placeholder={t("pillar.shared.urlNameExample")} className="mt-1 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label>
        <label className="block text-sm font-semibold text-slate-700">{t("pillar.shared.visitorTitle")}<input required maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label>
        <label className="block text-sm font-semibold text-slate-700">{t("pillar.shared.shortSummary")}<input maxLength={500} value={summary} onChange={(event) => setSummary(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label>
        <label className="block text-sm font-semibold text-slate-700">{t("pillar.shared.content")}<textarea rows={5} maxLength={12000} value={content} onChange={(event) => setContent(event.target.value)} placeholder={t("pillar.shared.contentHint")} className="mt-1 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label>
        {!actionMode ? <label className="flex items-start gap-3 rounded-xl border border-teal-100 bg-teal-50/50 p-3 text-sm font-semibold text-teal-950"><input type="checkbox" checked={allowResponses} onChange={(event) => setAllowResponses(event.target.checked)} className="mt-1 h-4 w-4 accent-emerald-700" /><span>{t("pillar.action.enable")}</span></label> : null}
        {allowResponses || actionMode ? <label className="block text-sm font-semibold text-slate-700">{t("pillar.action.prompt")}<input maxLength={240} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={t("pillar.action.promptHint")} className="mt-1 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label> : null}
        <fieldset><legend className="text-sm font-semibold text-slate-700">{t("pillar.shared.languages")}</legend><p className="mt-1 text-xs text-slate-500">{t("pillar.shared.languagesHint")}</p><div className="mt-2 flex flex-wrap gap-2">{uniqueLocaleCodes.map((code) => <label key={code} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"><input type="checkbox" checked={supportedLocales.includes(code)} onChange={() => toggleLocale(code)} className="accent-emerald-700" />{localeMetadata[code].nativeName}</label>)}</div></fieldset>
        <button disabled={busy} className="rounded-xl bg-faida-green px-4 py-2.5 text-sm font-bold text-faida-navy disabled:opacity-50">{busy ? t("common.loading") : t(actionMode ? "pillar.action.create" : "pillar.shared.create")}</button>
      </form>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold text-faida-navy">{t(actionMode ? "pillar.action.inbox" : "pillar.shared.saved")}</h3>
        <div className="mt-4 space-y-3">{listed.map((service) => {
          const publicPath = `/s/${encodeURIComponent(organizationSlug)}/${encodeURIComponent(service.slug)}`;
          const responses = responseLists[service.id];
          return <article key={service.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="font-semibold text-faida-navy">{service.title}</h4><p className="mt-1 text-xs text-slate-500">{t(typeKey(service.serviceType))} · /s/{organizationSlug}/{service.slug}</p>{service.summary ? <p className="mt-2 text-sm text-slate-600">{service.summary}</p> : null}</div><span className={`rounded-full px-3 py-1 text-xs font-bold ${service.published ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{t(service.published ? "pillar.shared.statusPublished" : "pillar.shared.statusDraft")}</span></div>
            <div className="mt-3 flex flex-wrap gap-2">{service.published ? <><a target="_blank" rel="noreferrer" href={publicPath} className="rounded-lg border px-3 py-1.5 text-xs font-semibold">{t("pillar.shared.open")}</a><a href={`/api/public-services/${encodeURIComponent(organizationSlug)}/${encodeURIComponent(service.slug)}/qr.svg`} download={`${service.slug}.svg`} className="rounded-lg border px-3 py-1.5 text-xs font-semibold">{t("common.downloadSvg")}</a></> : null}<button type="button" disabled={busy} onClick={() => void publish(service)} className="rounded-lg bg-teal-800 px-3 py-1.5 text-xs font-semibold text-white">{t(service.published ? "pillar.shared.unpublish" : "pillar.shared.publish")}</button>{service.published && <button type="button" disabled={busy} onClick={() => void loadResponses(service)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold">{t("pillar.action.viewResponses")}</button>}</div>
            {responses ? <div className="mt-4 space-y-3 border-t border-slate-100 pt-4"><h5 className="text-sm font-bold">{t("pillar.action.inbox")} ({responses.length})</h5>{responses.map((response) => <div key={response.id} className="rounded-lg bg-slate-50 p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-bold">{response.visitorName}</p><p className="mt-1 text-xs text-slate-600">{[response.visitorEmail, response.visitorPhone].filter(Boolean).join(" · ")}</p></div><span className="text-xs font-semibold text-slate-500">{t(response.status === "RESOLVED" ? "pillar.action.resolved" : response.status === "READ" ? "pillar.action.read" : "pillar.action.new")}</span></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{response.message}</p>{response.status !== "RESOLVED" ? <button type="button" disabled={busy} onClick={() => void updateResponse(service.id, response.id, response.status === "NEW" ? "READ" : "RESOLVED")} className="mt-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold">{t(response.status === "NEW" ? "pillar.action.markRead" : "pillar.action.markResolved")}</button> : null}</div>)}</div> : null}
          </article>;
        })}{!listed.length ? <p className="text-sm text-slate-500">{t("pillar.shared.empty")}</p> : null}</div>
      </section>
    </section>
    {message ? <p role="status" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{message}</p> : null}
  </div>;
}
