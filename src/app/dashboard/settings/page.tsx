"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardPageHeading from "@/components/dashboard/DashboardPageHeading";
import { useI18n } from "@/i18n/LocaleProvider";
import { localizedApiError } from "@/i18n/api-errors";
import type { ApiErrorEnvelope } from "@/lib/qr/client-types";
import {
  applyThemePreference,
  DEFAULT_DASHBOARD_PREFERENCES,
  readDashboardPreferences,
  writeDashboardPreferences,
  type DashboardPreferences,
  type QrExportFormatPreference,
  type QrFramePreference,
  type QrLogoPlacementPreference,
  type QrModulePreference,
  type ThemePreference,
} from "@/lib/dashboard-preferences";

type SessionData = { user: { id: string; name: string | null; email: string | null; role: string }; organization: { id: string; name: string; slug: string } };
type SessionResponse = ApiErrorEnvelope & { data?: SessionData };
type StorageData = { planName: string; storageBytesUsed: string; storageBytesLimit: string };
type StorageResponse = ApiErrorEnvelope & { data?: StorageData };
class LocalizedRequestError extends Error {}

function parseBytes(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${Math.floor(bytes)} B`;
  try {
    const units = ["KB", "MB", "GB", "TB"];
    let amount = bytes;
    let unitIndex = -1;
    do { amount /= 1024; unitIndex += 1; } while (amount >= 1024 && unitIndex < units.length - 1);
    return `${amount.toFixed(amount >= 100 ? 0 : 1)} ${units[unitIndex]}`;
  } catch {
    return "—";
  }
}

export default function SettingsPage() {
  const { t } = useI18n();
  const [session, setSession] = useState<SessionData | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<DashboardPreferences>(DEFAULT_DASHBOARD_PREFERENCES);
  const [preferenceStatus, setPreferenceStatus] = useState("");
  const [storage, setStorage] = useState<StorageData | null>(null);
  const [storageLoading, setStorageLoading] = useState(true);
  const [storageError, setStorageError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as SessionResponse;
        if (!response.ok || !body.data) throw new LocalizedRequestError(localizedApiError(body, "error.couldNotLoadSettings", t));
        if (active) setSession(body.data);
      })
      .catch((reason: unknown) => { if (active) setError(reason instanceof LocalizedRequestError ? reason.message : t("error.couldNotLoadSettings")); });
    return () => { active = false; };
  }, [t]);

  useEffect(() => {
    let active = true;
    fetch("/api/profile-assets", { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as StorageResponse;
        if (!response.ok || !body.data) throw new Error("Storage usage is currently unavailable.");
        if (active) setStorage(body.data);
      })
      .catch(() => { if (active) setStorageError("Workspace storage usage is currently unavailable."); })
      .finally(() => { if (active) setStorageLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const saved = readDashboardPreferences();
    setPreferences(saved);
    applyThemePreference(saved.theme);
  }, []);

  function updatePreferences(next: DashboardPreferences) {
    setPreferences(next);
    setPreferenceStatus(writeDashboardPreferences(next)
      ? "Preferences saved on this device."
      : "Preferences could not be saved in this browser.");
    applyThemePreference(next.theme);
  }

  function updateQr<K extends keyof DashboardPreferences["qr"]>(key: K, value: DashboardPreferences["qr"][K]) {
    updatePreferences({ ...preferences, qr: { ...preferences.qr, [key]: value } });
  }

  async function signOut() {
    setSaving(true);
    try { await fetch("/api/auth/logout", { method: "POST" }); } finally { window.location.assign("/login"); }
  }

  const identity = [
    { label: t("settings.name"), value: session?.user.name || "—" },
    { label: t("settings.email"), value: session?.user.email || "—" },
    { label: t("settings.organization"), value: session?.organization.name || t("settings.loading") },
    { label: t("settings.role"), value: session?.user.role || "—" },
    { label: t("settings.organizationSlug"), value: session?.organization.slug || "—" },
  ];
  const storageUsed = parseBytes(storage?.storageBytesUsed);
  const storageLimit = parseBytes(storage?.storageBytesLimit);
  const storagePercent = storageLimit > 0 ? Math.min(100, Math.floor((storageUsed / storageLimit) * 100)) : 0;

  return (
    <div className="space-y-6">
      <DashboardPageHeading eyebrow={t("common.workspace")} title={t("settings.title")} description="Manage your workspace identity, appearance, and default QR creation preferences." />
      {error ? <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</div> : null}
      {preferenceStatus ? <p role="status" aria-live="polite" className="text-xs font-medium text-emerald-800">{preferenceStatus}</p> : null}

      <section aria-labelledby="settings-workspace-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-emerald-50 text-lg font-black text-emerald-800">{session?.user.name?.slice(0, 1).toUpperCase() || "U"}</span>
          <div><h2 id="settings-workspace-title" className="font-semibold text-faida-navy">Workspace &amp; Account Details</h2><p className="text-xs text-faida-slate">{t("settings.authNote")}</p></div>
        </div>
        <dl className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          {identity.map((item) => <div key={item.label} className="min-w-0"><dt className="text-xs font-semibold text-faida-slate">{item.label}</dt><dd className="mt-1 break-words text-sm font-semibold text-faida-navy">{item.value}</dd></div>)}
          <div><dt className="text-xs font-semibold text-faida-slate">Default contact reference</dt><dd className="mt-1 text-sm font-semibold text-faida-navy"><a href="tel:+251975498916" className="underline decoration-slate-300 underline-offset-2">+251975498916</a></dd></div>
          <div><dt className="text-xs font-semibold text-faida-slate">Default domain reference</dt><dd className="mt-1 text-sm font-semibold text-faida-navy"><a href="https://faidatech.pro.et" target="_blank" rel="noreferrer" className="underline decoration-slate-300 underline-offset-2">faidatech.pro.et</a></dd></div>
        </dl>
      </section>

      <section aria-labelledby="settings-theme-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h2 id="settings-theme-title" className="font-semibold text-faida-navy">Appearance / Theme</h2><p className="mt-1 text-sm text-faida-slate">Choose how the dashboard follows your display preference.</p></div>
          <label className="w-full max-w-xs text-xs font-semibold text-slate-700">Theme preference
            <select aria-label="Appearance theme" value={preferences.theme} onChange={(event) => updatePreferences({ ...preferences, theme: event.target.value as ThemePreference })} className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-faida-navy focus:border-faida-teal focus:outline-none focus:ring-4 focus:ring-teal-50">
              <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
            </select>
          </label>
        </div>
        <p className="mt-3 text-xs text-slate-500">System follows your device setting. Your choice is stored locally in this browser.</p>
      </section>

      <section aria-labelledby="settings-qr-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-5"><h2 id="settings-qr-title" className="font-semibold text-faida-navy">Default QR &amp; Builder Preferences</h2><p className="mt-1 text-sm text-faida-slate">Used as starting values for new QR experiences; editing a saved QR keeps its existing settings.</p></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ColorPreference label="Page background" value={preferences.qr.pageBackground} onChange={(value) => updateQr("pageBackground", value)} />
          <ColorPreference label="QR modules" value={preferences.qr.moduleColor} onChange={(value) => updateQr("moduleColor", value)} />
          <ColorPreference label="QR eyes / frame accent" value={preferences.qr.eyeColor} onChange={(value) => updateQr("eyeColor", value)} />
          <PreferenceSelect label="Default frame" value={preferences.qr.frame} onChange={(value) => updateQr("frame", value as QrFramePreference)}><option value="rounded">Rounded</option><option value="square">Square</option><option value="none">None</option><option value="badge">Badge</option><option value="circle">Circle</option><option value="brand">Brand</option></PreferenceSelect>
          <PreferenceSelect label="Default modules" value={preferences.qr.modules} onChange={(value) => updateQr("modules", value as QrModulePreference)}><option value="square">Square</option><option value="round">Rounded</option><option value="circle">Circle</option><option value="diamond">Diamond</option><option value="heart">Heart</option><option value="line">Line / Bars</option></PreferenceSelect>
          <PreferenceSelect label="Default logo placement" value={preferences.qr.logoPlacement} onChange={(value) => updateQr("logoPlacement", value as QrLogoPlacementPreference)}><option value="center">Center</option><option value="above">Above</option><option value="none">No logo</option></PreferenceSelect>
          <PreferenceSelect label="Preferred download format" value={preferences.qr.exportFormat} onChange={(value) => updateQr("exportFormat", value as QrExportFormatPreference)}><option value="png">PNG</option><option value="svg">SVG</option></PreferenceSelect>
        </div>
      </section>

      <section aria-labelledby="settings-storage-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="settings-storage-title" className="font-semibold text-faida-navy">Storage Summary</h2><p className="mt-1 text-sm text-faida-slate">Files stored for this workspace.</p></div>{storage?.planName ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{storage.planName}</span> : null}</div>
        {storageLoading ? <p className="mt-5 text-sm text-slate-600">Loading workspace storage…</p> : storage ? <>
          <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2"><p className="text-lg font-semibold text-faida-navy">{formatBytes(storageUsed)} <span className="text-sm font-normal text-faida-slate">used of {formatBytes(storageLimit)}</span></p><p className="text-sm font-bold text-faida-slate">{storagePercent}%</p></div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Workspace storage used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={storagePercent}><div className={`h-full rounded-full ${storagePercent >= 90 ? "bg-rose-600" : "bg-emerald-700"}`} style={{ width: `${Math.max(storagePercent, storageUsed > 0 ? 1 : 0)}%` }} /></div>
        </> : <p role="status" className="mt-5 text-sm text-slate-600">{storageError || "Storage usage is unavailable."}</p>}
        {storageError && storage ? <p role="status" className="mt-2 text-xs text-amber-800">{storageError}</p> : null}
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <Link href="/dashboard/billing" className="inline-flex rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100">Billing and plan</Link>
        <button type="button" disabled={saving} onClick={() => void signOut()} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50">{saving ? t("shell.signingOut") : t("settings.signOut")}</button>
      </section>
    </div>
  );
}

function ColorPreference({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block min-w-0 text-xs font-semibold text-slate-700">{label}<span className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-300 bg-white p-2"><input aria-label={`${label} color`} type="color" value={value} onChange={(event) => onChange(event.target.value.toUpperCase())} className="h-8 w-10 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0" /><span className="text-xs font-medium text-slate-600">{value}</span></span></label>;
}

function PreferenceSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return <label className="block min-w-0 text-xs font-semibold text-slate-700">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-faida-navy focus:border-faida-teal focus:outline-none focus:ring-4 focus:ring-teal-50">{children}</select></label>;
}
