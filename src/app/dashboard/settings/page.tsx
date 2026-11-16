"use client";

import { useEffect, useState } from "react";
import DashboardPageHeading from "@/components/dashboard/DashboardPageHeading";
import { useI18n } from "@/i18n/LocaleProvider";
import { localizedApiError } from "@/i18n/api-errors";
import type { ApiErrorEnvelope } from "@/lib/qr/client-types";

type SessionData = { user: { id: string; name: string | null; email: string | null; role: string }; organization: { id: string; name: string; slug: string } };
type SessionResponse = ApiErrorEnvelope & { data?: SessionData };
class LocalizedRequestError extends Error {}

export default function SettingsPage() {
  const { t } = useI18n();
  const [session, setSession] = useState<SessionData | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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

  async function signOut() {
    setSaving(true);
    try { await fetch("/api/auth/logout", { method: "POST" }); } finally { window.location.assign("/login"); }
  }

  const items = [
    { label: t("settings.name"), value: session?.user.name || "—" },
    { label: t("settings.email"), value: session?.user.email || "—" },
    { label: t("settings.organization"), value: session?.organization.name || t("settings.loading") },
    { label: t("settings.role"), value: session?.user.role || "—" },
    { label: t("settings.organizationSlug"), value: session?.organization.slug || "—" },
  ];

  return (
    <div className="space-y-6">
      <DashboardPageHeading eyebrow={t("common.workspace")} title={t("settings.title")} description={t("settings.description")} />
      {error ? <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</div> : null}
      <section className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"><div className="flex items-center gap-3 border-b border-slate-100 pb-5"><span className="grid h-11 w-11 place-items-center rounded-full bg-emerald-50 text-lg font-black text-emerald-800">{session?.user.name?.slice(0, 1).toUpperCase() || "U"}</span><div><h2 className="font-semibold text-faida-navy">{t("settings.accountIdentity")}</h2><p className="text-xs text-faida-slate">{t("settings.authNote")}</p></div></div>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2">{items.map((item) => <div key={item.label}><dt className="text-xs font-semibold text-faida-slate">{item.label}</dt><dd className="mt-1 break-words text-sm font-semibold text-faida-navy">{item.value}</dd></div>)}</dl>
        <div className="mt-7 border-t border-slate-100 pt-5"><button type="button" disabled={saving} onClick={() => void signOut()} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50">{saving ? t("shell.signingOut") : t("settings.signOut")}</button></div>
      </section>
    </div>
  );
}
