"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useI18n } from "@/i18n/LocaleProvider";
import type { MessageKey } from "@/i18n/messages";
import { verticalTemplates, type ProfileKindCode } from "@/lib/templates/registry";

type Profile = {
  id: string;
  sector: string;
  profileKind: string;
  displayName: string;
  slug?: string;
  approvalStatus: string;
  rejectionReason?: string | null;
  profileData?: unknown;
  customFields?: unknown;
};
type Envelope<T> = { data?: T; error?: { message?: string; code?: string } };
type CustomField = { id: number; name: string; value: string; kind: "text" | "link" | "file" | "social" };
const RESERVED_PROFILE_KEYS = new Set(["_pageBackground", "_qrForeground", "_qrShape", "_qrDots", "_logoPlacement"]);
const CUSTOM_PRESETS = ["Phone", "Email", "Website", "Address", "WhatsApp", "Facebook", "Instagram", "LinkedIn", "YouTube", "Telegram", "Testimonial", "Rating", "Map", "Spotlight"];
function safeExternalUrl(value: string): string | null { try { const url = new URL(value.trim()); return ["https:", "http:"].includes(url.protocol) ? url.href : null; } catch { return null; } }
const sectorMessage = (code: string) => `template.sector.${code}` as MessageKey;
const fieldMessage = (name: string) => `template.field.${name}` as MessageKey;
const formKinds: ProfileKindCode[] = ["INDIVIDUAL", "ORGANIZATION", "GOVERNMENT", "GROUP"];

function objectStrings(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, typeof item === "string" ? item : JSON.stringify(item)]));
}

export default function SectorProfileWizard() {
  const { t, locale } = useI18n();
  const [sector, setSector] = useState<string>(verticalTemplates[0]?.code ?? "OTHER");
  const [customSectorName, setCustomSectorName] = useState("");
  const [showAllSectorFields, setShowAllSectorFields] = useState(false);
  const [profileKind, setProfileKind] = useState<ProfileKindCode>("ORGANIZATION");
  const [displayName, setDisplayName] = useState("");
  const [profileData, setProfileData] = useState<Record<string, string>>({});
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [profilesLoadFailed, setProfilesLoadFailed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [nextCustomId, setNextCustomId] = useState(1);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const template = useMemo(() => verticalTemplates.find((item) => item.code === sector), [sector]);
  const templateFields: readonly string[] = template?.fields ?? [];
  const sectorLabel = sector === "OTHER" ? customSectorName || t("templates.customSector") : t(sectorMessage(sector));
  const pageBackground = profileData._pageBackground || "#F7FAF9";
  const qrForeground = profileData._qrForeground || "#0F172A";
  const qrShape = profileData._qrShape || "square";
  const qrDots = profileData._qrDots || "square";
  const logoPlacement = profileData._logoPlacement || "center";

  const loadProfiles = useCallback(async () => {
    setProfilesLoading(true);
    setProfilesLoadFailed(false);
    try {
    const response = await fetch("/api/profiles?limit=50", { cache: "no-store" });
    const body = await response.json() as Envelope<Profile[]>;
    if (!response.ok || !body.data) throw new Error(t("templates.loadError"));
    setProfiles(body.data);
    } catch (error) {
      setProfilesLoadFailed(true);
      setProfiles([]);
      throw error;
    } finally { setProfilesLoading(false); }
  }, [t]);

  useEffect(() => { void loadProfiles().catch(() => {}); }, [loadProfiles]);

  function resetForm() {
    setDisplayName("");
    setProfileData({});
    setCustomFields([]);
    setProfileKind("ORGANIZATION");
    setEditingId(null);
    setCustomSectorName("");
    setShowAllSectorFields(false);
    setNextCustomId(1);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    const extensions: Record<string, string> = {};
    for (const field of customFields) {
      const key = field.name.trim();
      if (!key || !field.value.trim()) continue;
      if (Object.hasOwn(extensions, key)) {
        setNotice(t("templates.duplicateCustomField"));
        setBusy(false);
        return;
      }
      extensions[key] = field.value.trim();
    }
    if (sector === "OTHER") extensions.customSectorName = customSectorName.trim();
    if (customFields.some((field) => RESERVED_PROFILE_KEYS.has(field.name.trim()))) { setNotice(t("templates.duplicateCustomField")); setBusy(false); return; }
    try {
      const response = await fetch(editingId ? `/api/profiles/${encodeURIComponent(editingId)}` : "/api/profiles", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sector,
          ...(sector === "OTHER" ? { customSectorName: customSectorName.trim() } : {}),
          profileKind,
          displayName: displayName.trim(),
          profileData: Object.fromEntries(Object.entries(profileData).filter(([, value]) => value.trim()).map(([key, value]) => [key, value.trim()])),
          customFields: extensions,
        }),
      });
      const body = await response.json() as Envelope<Profile>;
      if (!response.ok || !body.data) throw new Error(t("templates.saveError"));
      setNotice(editingId ? t("templates.updatedNotice") : t("templates.savedNotice"));
      resetForm();
      await loadProfiles();
    } catch (error) {
      setNotice(t("templates.saveError"));
    } finally {
      setBusy(false);
    }
  }

  function editProfile(profile: Profile) {
    setEditingId(profile.id);
    setSector(profile.sector);
    setCustomSectorName(profile.sector === "OTHER" ? String(objectStrings(profile.customFields).customSectorName ?? "") : "");
    setProfileKind(profile.profileKind as ProfileKindCode);
    setDisplayName(profile.displayName);
    setProfileData(objectStrings(profile.profileData));
    const custom = objectStrings(profile.customFields);
    const fields = Object.entries(custom).filter(([name]) => name !== "customSectorName").map(([name, value], index) => ({ id: index + 1, name, value, kind: /^(https?:\/\/|www\.)/i.test(value) ? "link" as const : "text" as const }));
    setCustomFields(fields);
    setNextCustomId(fields.length + 1);
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function transition(profile: Profile, decision: "SUBMIT" | "APPROVE" | "REJECT") {
    setBusy(true);
    setNotice("");
    try {
      const reason = decision === "REJECT" ? window.prompt(t("templates.rejectionPrompt")) : undefined;
      if (decision === "REJECT" && !reason?.trim()) return;
      const response = await fetch(`/api/profiles/${encodeURIComponent(profile.id)}/approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, ...(reason ? { reason } : {}) }),
      });
      const body = await response.json() as Envelope<Profile>;
      if (!response.ok) throw new Error(t("templates.approvalError"));
      setNotice(t("templates.approvalUpdated"));
      await loadProfiles();
    } catch (error) {
      setNotice(t("templates.approvalError"));
    } finally {
      setBusy(false);
    }
  }

  async function importCsv(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/profiles/import", { method: "POST", headers: { "Content-Type": "text/csv", "X-Faida-Locale": locale }, body: await file.text() });
      const body = await response.json() as Envelope<{ createdCount: number; rejectedCount: number }>;
      if (!response.ok && response.status !== 207) throw new Error(t("templates.importError"));
      setNotice(t("templates.importSummary", { created: body.data?.createdCount ?? 0, rejected: body.data?.rejectedCount ?? 0 }));
      await loadProfiles();
    } catch (error) {
      setNotice(t("templates.importError"));
    } finally {
      setBusy(false);
    }
  }

  function downloadCsvTemplate() {
    const rows = [
      [t("templates.csvSector"), t("templates.displayName"), t("templates.profileKind"), ...templateFields.map((field) => t(fieldMessage(field)))],
      [sector === "OTHER" ? customSectorName || t("templates.customSector") : t(sectorMessage(sector)), "", t("templates.organization"), ...templateFields.map(() => "")],
    ];
    const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `faidatech-${sector.toLowerCase()}-profiles.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const statusKey = (status: string): MessageKey => ({
    DRAFT: "templates.statusDraft",
    PENDING_APPROVAL: "templates.statusPending",
    APPROVED: "templates.statusApproved",
    REJECTED: "templates.statusRejected",
  }[status] as MessageKey) ?? "templates.statusDraft";

  return <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px] xl:gap-7">
    <div className="min-w-0 space-y-5">
      <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-800">{t("templates.sectorCount", { count: verticalTemplates.length })}</p><h2 className="mt-2 text-xl font-semibold text-faida-navy">{t("templates.title")}</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-faida-slate">{t("templates.description")}</p></div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={downloadCsvTemplate} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-faida-navy hover:bg-slate-50">{t("templates.downloadCsvTemplate")}</button><label className="cursor-pointer rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-faida-navy hover:bg-slate-50">{t("templates.importCsv")}<input className="sr-only" type="file" accept=".csv,text/csv" disabled={busy} onChange={(event) => { void importCsv(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} /></label></div>
        </div>
        <p className="mt-4 rounded-xl bg-teal-50 px-4 py-3 text-sm leading-6 text-teal-950">{t("templates.approvalFlow")} {t("templates.csvHint")}</p>
        <label className="mt-5 block text-sm font-semibold text-slate-700">{t("templates.chooseSector")}<select className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3" value={sector} onChange={(event) => { setSector(event.target.value); setProfileData({}); }}>
          {verticalTemplates.map((item) => <option key={item.code} value={item.code}>{t(sectorMessage(item.code))}</option>)}
          <option value="OTHER">{t("templates.customSector")}</option>
        </select></label>
        {sector === "OTHER" ? <label className="mt-4 block text-sm font-semibold text-slate-700">{t("templates.customSectorName")}<input required maxLength={120} value={customSectorName} onChange={(event) => setCustomSectorName(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label> : null}
        {templateFields.length ? <div className="mt-3 flex flex-wrap gap-2">{templateFields.slice(0, 4).map((field) => <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-600" key={field}>{t(fieldMessage(field))}</span>)}</div> : null}
      </section>

      <form onSubmit={saveProfile} className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div><h2 className="text-lg font-semibold text-faida-navy">{editingId ? t("templates.editDraft") : t("templates.createDraft")}</h2><p className="mt-1 text-sm text-faida-slate">{t("templates.formHint")}</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-700">{t("templates.profileKind")}<select className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3" value={profileKind} onChange={(event) => setProfileKind(event.target.value as ProfileKindCode)}>{formKinds.map((kind) => <option key={kind} value={kind}>{t(({ INDIVIDUAL: "templates.individual", ORGANIZATION: "templates.organization", GOVERNMENT: "templates.government", GROUP: "templates.group" } as const)[kind])}</option>)}</select></label>
          <label className="block text-sm font-semibold text-slate-700">{t("templates.displayName")}<input required maxLength={180} value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label>
        </div>
        <div><h3 className="font-semibold text-faida-navy">{t("templates.sectorDetails")}</h3><p className="mt-1 text-xs leading-5 text-faida-slate">{t("templates.fieldsHint")}</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          {templateFields.filter((field) => !RESERVED_PROFILE_KEYS.has(field)).slice(0, showAllSectorFields ? undefined : 4).map((field) => <label key={field} className="block text-sm font-semibold text-slate-700">{t(fieldMessage(field))}<textarea rows={2} maxLength={20000} value={profileData[field] ?? ""} onChange={(event) => setProfileData((current) => ({ ...current, [field]: event.target.value }))} className="mt-1.5 w-full resize-y rounded-xl border border-slate-300 p-3 font-normal" /></label>)}
        </div>
        {templateFields.length > 4 ? <button type="button" onClick={() => setShowAllSectorFields((show) => !show)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-faida-navy">{showAllSectorFields ? t("templates.showCoreFields") : t("templates.showMoreFields")}</button> : null}
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="font-semibold text-faida-navy">{t("templates.designTitle")}</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-700">{t("templates.pageBackground")}<input aria-label={t("templates.pageBackground")} type="color" value={pageBackground} onChange={(event) => setProfileData((current) => ({ ...current, _pageBackground: event.target.value }))} className="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-white p-1" /></label>
            <label className="text-xs font-semibold text-slate-700">{t("templates.qrInk")}<input aria-label={t("templates.qrInk")} type="color" value={qrForeground} onChange={(event) => setProfileData((current) => ({ ...current, _qrForeground: event.target.value }))} className="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-white p-1" /></label>
            <label className="text-xs font-semibold text-slate-700">{t("templates.qrFrame")}<select value={qrShape} onChange={(event) => setProfileData((current) => ({ ...current, _qrShape: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2"><option value="square">{t("templates.qrSquare")}</option><option value="rounded">{t("templates.qrRounded")}</option><option value="brand">{t("templates.qrBrand")}</option></select></label>
            <label className="text-xs font-semibold text-slate-700">{t("templates.qrDots")}<select value={qrDots} onChange={(event) => setProfileData((current) => ({ ...current, _qrDots: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2"><option value="square">{t("templates.qrSquareDots")}</option><option value="round">{t("templates.qrRoundDots")}</option><option value="large">{t("templates.qrLargeDots")}</option></select></label>
            <label className="text-xs font-semibold text-slate-700">{t("templates.logoPlacement")}<select value={logoPlacement} onChange={(event) => setProfileData((current) => ({ ...current, _logoPlacement: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2"><option value="center">{t("templates.logoCenter")}</option><option value="top">{t("templates.logoTop")}</option><option value="bottom">{t("templates.logoBottom")}</option></select></label>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">{t("templates.qrSafetyNote")}</p>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="font-semibold text-faida-navy">Visitor actions & trust</h3>
          <p className="mt-1 text-xs text-slate-600">Choose optional actions and trust signals; these settings are saved with your profile.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={customFields.some((f) => f.name === "_spotlight" && f.value === "true")} onChange={(e) => setCustomFields((fs) => { const existing = fs.find((f) => f.name === "_spotlight"); return existing ? fs.map((f) => f.id === existing.id ? { ...f, value: String(e.target.checked) } : f) : [...fs, { id: nextCustomId, name: "_spotlight", value: String(e.target.checked), kind: "text" }]; })} /> Spotlight profile</label>
            <label className="text-xs font-semibold text-slate-700">Rating mode<select value={customFields.find((f) => f.name === "_ratingMode")?.value ?? "off"} onChange={(e) => setCustomFields((fs) => { const existing = fs.find((f) => f.name === "_ratingMode"); return existing ? fs.map((f) => f.id === existing.id ? { ...f, value: e.target.value } : f) : [...fs, { id: nextCustomId, name: "_ratingMode", value: e.target.value, kind: "text" }]; })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2"><option value="off">Off</option><option value="stars">Star rating</option><option value="stars-review">Stars + written review</option></select></label>
            <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Testimonial / review prompt<input value={customFields.find((f) => f.name === "_testimonialPrompt")?.value ?? ""} onChange={(e) => setCustomFields((fs) => { const existing = fs.find((f) => f.name === "_testimonialPrompt"); return existing ? fs.map((f) => f.id === existing.id ? { ...f, value: e.target.value } : f) : [...fs, { id: nextCustomId, name: "_testimonialPrompt", value: e.target.value, kind: "text" }]; })} maxLength={500} placeholder="What did you think of our service?" className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-normal" /></label>
          </div>
        </section>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-faida-navy">{t("templates.customFieldsTitle")}</h3><p className="mt-1 text-xs leading-5 text-faida-slate">{t("templates.customFieldsHint")}</p></div><button type="button" onClick={() => { setCustomFields((current) => [...current, { id: nextCustomId, name: "", value: "", kind: "text" }]); setNextCustomId((value) => value + 1); }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-faida-navy">{t("templates.addCustomField")}</button></div>
          <div className="mt-3 flex flex-wrap gap-2">{CUSTOM_PRESETS.map((preset) => <button key={preset} type="button" onClick={() => { if (customFields.some((f) => f.name.toLowerCase() === preset.toLowerCase())) return; setCustomFields((current) => [...current, { id: nextCustomId, name: preset, value: "", kind: /^(Website|WhatsApp|Facebook|Instagram|LinkedIn|YouTube|Telegram|Map)$/.test(preset) ? "social" : preset === "Email" ? "link" : "text" }]); setNextCustomId((n) => n + 1); }} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-faida-navy">+ {preset}</button>)}</div>
          {customFields.filter((field) => !field.name.startsWith("_")).map((field) => <div key={field.id} className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,0.8fr)_130px_auto]"><label className="text-xs font-semibold text-slate-600">{t("templates.customFieldName")}<input maxLength={80} value={field.name} onChange={(event) => setCustomFields((current) => current.map((item) => item.id === field.id ? { ...item, name: event.target.value } : item))} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm font-normal" /></label><label className="text-xs font-semibold text-slate-600">{t("templates.customFieldValue")}<select value={field.kind} onChange={(event) => setCustomFields((current) => current.map((item) => item.id === field.id ? { ...item, kind: event.target.value as CustomField["kind"] } : item))} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"><option value="text">Text</option><option value="link">Link</option><option value="file">File</option><option value="social">Social</option></select></label><button type="button" aria-label={t("templates.removeCustomField")} onClick={() => setCustomFields((current) => current.filter((item) => item.id !== field.id))} className="self-end rounded-lg border border-slate-300 px-3 py-2.5 text-sm">×</button></div>
            {field.kind === "file" ? <div className="mt-2 flex flex-wrap items-center gap-2"><label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold">Upload PDF/image<input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="sr-only" disabled={uploadingId !== null || busy} onChange={async (event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (!file) return; setUploadingId(field.id); try { const form = new FormData(); form.append("file", file); const res = await fetch("/api/profile-assets", { method: "POST", body: form }); const result = await res.json() as Envelope<{url:string}>; if (!res.ok || !result.data?.url) throw new Error(); setCustomFields((current) => current.map((item) => item.id === field.id ? { ...item, value: result.data!.url } : item)); } catch { setNotice(t("templates.saveError")); } finally { setUploadingId(null); } }} /></label><span className="text-xs text-slate-500">{uploadingId === field.id ? t("common.loading") : field.value ? "File uploaded" : "PDF, PNG, JPEG or WebP · 10 MiB max"}</span>{field.value ? <a href={safeExternalUrl(field.value) ?? "#"} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-800 underline">Open uploaded file</a> : null}</div> : <textarea rows={1} maxLength={20000} value={field.value} onChange={(event) => setCustomFields((current) => current.map((item) => item.id === field.id ? { ...item, value: event.target.value } : item))} placeholder={field.kind === "link" || field.kind === "social" ? "https://…" : ""} className="mt-2 w-full rounded-lg border border-slate-300 p-2.5 text-sm font-normal" />}
          </div>)}
        </div>
        <div className="flex flex-wrap gap-2"><button disabled={busy} className="rounded-xl bg-faida-green px-4 py-2.5 text-sm font-bold text-faida-navy disabled:opacity-50">{busy ? t("common.loading") : editingId ? t("templates.saveChanges") : t("templates.saveDraft")}</button>{editingId ? <button type="button" onClick={resetForm} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-faida-navy">{t("common.cancel")}</button> : null}</div>
      </form>

      <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-faida-navy">{t("templates.savedProfiles")}</h2>
        <div className="mt-4 space-y-3">{profiles.map((profile) => <article key={profile.id} className="rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-faida-navy">{profile.displayName}</h3><p className="mt-1 text-xs text-slate-500">{profile.sector === "OTHER" ? objectStrings(profile.customFields).customSectorName || t("templates.customSector") : t(sectorMessage(profile.sector))} · {t(({ INDIVIDUAL: "templates.individual", ORGANIZATION: "templates.organization", GOVERNMENT: "templates.government", GROUP: "templates.group" } as Record<string, MessageKey>)[profile.profileKind] ?? "templates.organization")}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{t(statusKey(profile.approvalStatus))}</span></div>
          {profile.rejectionReason ? <p className="mt-2 text-xs text-rose-700">{profile.rejectionReason}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">{["DRAFT", "REJECTED"].includes(profile.approvalStatus) ? <><button type="button" disabled={busy} onClick={() => editProfile(profile)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold">{t("templates.editDraft")}</button><button type="button" disabled={busy} onClick={() => void transition(profile, "SUBMIT")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold">{t("templates.submitForApproval")}</button></> : null}{profile.approvalStatus === "PENDING_APPROVAL" ? <><button type="button" disabled={busy} onClick={() => void transition(profile, "APPROVE")} className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white">{t("templates.approve")}</button><button type="button" disabled={busy} onClick={() => void transition(profile, "REJECT")} className="rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white">{t("templates.reject")}</button></> : null}</div>
        </article>)}{profilesLoading ? <p role="status" className="text-sm text-slate-500">{t("common.loading")}</p> : profilesLoadFailed ? <div role="alert" className="flex flex-wrap items-center justify-between gap-3 text-sm text-rose-700"><span>{t("templates.loadError")}</span><button type="button" onClick={() => void loadProfiles().catch(() => {})} className="rounded-lg border border-rose-300 px-3 py-1.5 font-semibold">{t("templates.retryLoad")}</button></div> : !profiles.length ? <p className="text-sm text-slate-500">{t("templates.noProfiles")}</p> : null}</div>
        <p className="mt-4 text-xs leading-5 text-slate-500">{t("templates.csvFormat")}</p>
      </section>
      {notice ? <p role="status" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{notice}</p> : null}
    </div>

    <aside className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-faida-teal">{t("templates.profilePreview")}</p><p className="mt-1 text-xs text-faida-slate">{t("templates.previewHint")}</p>
      <div className="mx-auto mt-5 w-full max-w-[292px] rounded-[34px] border-[7px] border-faida-navy bg-faida-navy p-1.5 shadow-xl"><div className="min-h-[410px] overflow-hidden rounded-[25px]" style={{ backgroundColor: pageBackground }}>
        <div className="flex h-8 items-center justify-center bg-white"><span className="h-1.5 w-14 rounded-full bg-slate-200" /></div>
        <div className="px-4 pb-5 pt-5"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-teal-800">{sectorLabel}</p><h2 className="mt-2 break-words text-lg font-bold text-faida-navy">{displayName.trim() || t("templates.previewName")}</h2><p className="mt-1 text-[10px] text-faida-slate">{t(({ INDIVIDUAL: "templates.individual", ORGANIZATION: "templates.organization", GOVERNMENT: "templates.government", GROUP: "templates.group" } as const)[profileKind])}</p>
          <div className="mt-4 space-y-2">{templateFields.filter((field) => profileData[field]?.trim()).slice(0, 5).map((field) => <div key={field} className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[9px] font-bold text-teal-800">{t(fieldMessage(field))}</p><p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-[10px] leading-4 text-slate-700">{profileData[field]}</p></div>)}</div>
          {!templateFields.some((field) => profileData[field]?.trim()) ? <p className="mt-5 rounded-xl border border-dashed border-slate-300 p-4 text-center text-[10px] leading-5 text-faida-slate">{t("templates.previewEmpty")}</p> : null}
          {customFields.filter((field) => !field.name.startsWith("_") && field.name.trim() && field.value.trim()).slice(0, 6).map((field) => <div key={field.id} className="mt-2 rounded-xl border border-slate-200 bg-white p-3"><p className="text-[9px] font-bold text-teal-800">{field.name}</p>{(field.kind === "link" || field.kind === "social" || field.kind === "file") && safeExternalUrl(field.value) ? <a href={safeExternalUrl(field.value)!} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all text-[10px] leading-4 text-teal-800 underline">{field.value}</a> : <p className="mt-1 line-clamp-3 break-words text-[10px] leading-4 text-slate-700">{field.value}</p>}</div>)}
          <div className="mt-3 grid grid-cols-3 gap-2">{[["Phone", "tel:"], ["Message", "sms:"], ["Map", "https://maps.google.com/?q="]].map(([label, href]) => <a key={label} href={href === "https://maps.google.com/?q=" ? href + encodeURIComponent(profileData.address || displayName) : href + encodeURIComponent(profileData.phone || "")} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noopener noreferrer" : undefined} className="rounded-lg bg-teal-800 px-2 py-2 text-center text-[9px] font-semibold text-white">{label}</a>)}</div>
          {customFields.some((field) => field.name === "_spotlight" && field.value === "true") ? <div className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-[10px] font-bold text-amber-900">Spotlight</div> : null}
        </div><div className="flex h-6 items-center justify-center bg-white"><span className="h-1 w-16 rounded-full bg-slate-300" /></div>
      </div></div>
    </aside>
  </div>;
}
