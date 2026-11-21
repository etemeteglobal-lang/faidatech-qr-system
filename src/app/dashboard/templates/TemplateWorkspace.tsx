"use client";

import { useEffect, useMemo, useState } from "react";
import { verticalTemplates, type ProfileKindCode, type VerticalSectorCode } from "@/lib/templates/registry";
import { useI18n } from "@/i18n/LocaleProvider";

type Profile = { id: string; sector: string; profileKind: string; displayName: string; approvalStatus: string; rejectionReason: string | null; profileData?: unknown; customFields?: unknown };
type Envelope<T> = { data?: T; error?: { message?: string } };
const jsonDefault = "{}";

export default function TemplateWorkspace() {
  const { t } = useI18n();
  const [sector, setSector] = useState<VerticalSectorCode>(verticalTemplates[0].code);
  const [kind, setKind] = useState<ProfileKindCode>("ORGANIZATION");
  const [displayName, setDisplayName] = useState("");
  const [profileData, setProfileData] = useState(jsonDefault);
  const [customFields, setCustomFields] = useState(jsonDefault);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const template = useMemo(() => verticalTemplates.find((item) => item.code === sector)!, [sector]);

  async function loadProfiles() {
    const response = await fetch("/api/profiles?limit=50", { cache: "no-store" });
    const body = await response.json() as Envelope<Profile[]>;
    if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Could not load profiles.");
    setProfiles(body.data);
  }
  useEffect(() => { void loadProfiles().catch((error: unknown) => setNotice(error instanceof Error ? error.message : "Could not load profiles.")); }, []);

  async function submitProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice("");
    try {
      const response = await fetch(editingId ? `/api/profiles/${encodeURIComponent(editingId)}` : "/api/profiles", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sector, profileKind: kind, displayName, profileData: JSON.parse(profileData), customFields: JSON.parse(customFields) }) });
      const body = await response.json() as Envelope<Profile>;
      if (!response.ok) throw new Error(body.error?.message ?? "Profile could not be saved.");
      setDisplayName(""); setEditingId(null); setNotice(editingId ? "Profile draft updated." : "Draft profile saved."); await loadProfiles();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Check the profile JSON and try again."); }
    finally { setBusy(false); }
  }

  async function importCsv(file: File | undefined) {
    if (!file) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/profiles/import", { method: "POST", headers: { "Content-Type": "text/csv" }, body: await file.text() });
      const body = await response.json() as Envelope<{ createdCount: number; rejectedCount: number }>;
      if (!response.ok && response.status !== 207) throw new Error(body.error?.message ?? "CSV import failed.");
      setNotice(`Imported ${body.data?.createdCount ?? 0} draft(s); rejected ${body.data?.rejectedCount ?? 0} row(s).`); await loadProfiles();
    } catch (error) { setNotice(error instanceof Error ? error.message : "CSV import failed."); }
    finally { setBusy(false); }
  }

  async function transition(profile: Profile, decision: "SUBMIT" | "APPROVE" | "REJECT") {
    setBusy(true); setNotice("");
    try {
      const reason = decision === "REJECT" ? window.prompt("Reason for rejection (required):") : undefined;
      if (decision === "REJECT" && !reason?.trim()) return;
      const response = await fetch(`/api/profiles/${encodeURIComponent(profile.id)}/approval`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, ...(reason ? { reason } : {}) }) });
      const body = await response.json() as Envelope<Profile>;
      if (!response.ok) throw new Error(body.error?.message ?? "Approval update failed.");
      setNotice("Approval status updated."); await loadProfiles();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Approval update failed."); }
    finally { setBusy(false); }
  }

  function beginEdit(profile: Profile) {
    setEditingId(profile.id);
    setSector(profile.sector as VerticalSectorCode);
    setKind(profile.profileKind as ProfileKindCode);
    setDisplayName(profile.displayName);
    setProfileData(JSON.stringify(profile.profileData ?? {}, null, 2));
    setCustomFields(JSON.stringify(profile.customFields ?? {}, null, 2));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return <div className="space-y-6">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-800">{t("templates.sectorCount", { count: verticalTemplates.length })}</p><h1 className="mt-2 text-2xl font-bold">{t("templates.title")}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{t("templates.description")}</p></div><label className="cursor-pointer rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">Import CSV<input className="sr-only" type="file" accept=".csv,text/csv" disabled={busy} onChange={(event) => { void importCsv(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label></div>
      <p className="mt-4 rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-950">{t("templates.customFields")} {t("templates.csvHint")} {t("templates.approvalFlow")}</p>
      <div className="mt-5 flex flex-wrap gap-2">{verticalTemplates.map((item) => <button type="button" key={item.code} onClick={() => setSector(item.code)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${item.code === sector ? "border-teal-700 bg-teal-800 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{item.label}</button>)}</div>
      <div className="mt-4"><h2 className="font-semibold text-slate-900">{template.label}</h2><div className="mt-2 flex flex-wrap gap-2">{template.fields.map((field) => <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600" key={field}>{field}</span>)}</div></div>
    </section>
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <form onSubmit={submitProfile} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold">{editingId ? "Edit profile draft" : "Create profile draft"}</h2>
        <label className="block text-sm font-medium">Sector<select className="mt-1 w-full rounded-xl border border-slate-300 p-3" value={sector} onChange={(event) => setSector(event.target.value as VerticalSectorCode)}>{verticalTemplates.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
        <label className="block text-sm font-medium">Profile type<select className="mt-1 w-full rounded-xl border border-slate-300 p-3" value={kind} onChange={(event) => setKind(event.target.value as ProfileKindCode)}><option value="INDIVIDUAL">{t("templates.individual")}</option><option value="ORGANIZATION">{t("templates.organization")}</option><option value="GOVERNMENT">{t("templates.government")}</option><option value="GROUP">{t("templates.group")}</option></select></label>
        <label className="block text-sm font-medium">Display name<input required maxLength={180} className="mt-1 w-full rounded-xl border border-slate-300 p-3" value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>
        <label className="block text-sm font-medium">Profile data (JSON)<textarea rows={4} className="mt-1 w-full rounded-xl border border-slate-300 p-3 font-mono text-xs" value={profileData} onChange={(event) => setProfileData(event.target.value)} /></label>
        <label className="block text-sm font-medium">Custom fields / blocks (JSON)<textarea rows={4} className="mt-1 w-full rounded-xl border border-slate-300 p-3 font-mono text-xs" value={customFields} onChange={(event) => setCustomFields(event.target.value)} /></label>
        <button disabled={busy} className="rounded-xl bg-faida-green px-4 py-2.5 text-sm font-bold text-faida-navy disabled:opacity-50">{busy ? "Saving…" : editingId ? "Update draft" : "Save draft"}</button>{editingId ? <button type="button" onClick={() => { setEditingId(null); setDisplayName(""); setProfileData(jsonDefault); setCustomFields(jsonDefault); }} className="ms-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold">Cancel edit</button> : null}
      </form>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-bold">Profiles and approvals</h2><div className="mt-4 space-y-3">{profiles.map((profile) => <article key={profile.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{profile.displayName}</h3><p className="mt-1 text-xs text-slate-500">{profile.sector} · {profile.profileKind}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{profile.approvalStatus.replaceAll("_", " ")}</span></div>{profile.rejectionReason ? <p className="mt-2 text-xs text-rose-700">{profile.rejectionReason}</p> : null}<div className="mt-3 flex flex-wrap gap-2">{["DRAFT", "REJECTED"].includes(profile.approvalStatus) ? <><button disabled={busy} onClick={() => beginEdit(profile)} className="rounded-lg border px-3 py-1.5 text-xs font-semibold">Edit draft</button><button disabled={busy} onClick={() => void transition(profile, "SUBMIT")} className="rounded-lg border px-3 py-1.5 text-xs font-semibold">Submit for approval</button></> : null}{profile.approvalStatus === "PENDING_APPROVAL" ? <><button disabled={busy} onClick={() => void transition(profile, "APPROVE")} className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white">Approve</button><button disabled={busy} onClick={() => void transition(profile, "REJECT")} className="rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white">Reject</button></> : null}</div></article>)}{!profiles.length ? <p className="text-sm text-slate-500">No profiles yet.</p> : null}</div></section>
    </section>
    {notice ? <p role="status" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{notice}</p> : null}
    <p className="text-xs text-slate-500">CSV columns: <code>sector,displayName,profileKind,profileDataJson,customFieldsJson</code>. Import creates drafts; review and submit after validation.</p>
  </div>;
}
