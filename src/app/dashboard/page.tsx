"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import DashboardPageHeading from "@/components/dashboard/DashboardPageHeading";
import { useI18n } from "@/i18n/LocaleProvider";
import { formatNumber } from "@/i18n/format";
import { localizedApiError } from "@/i18n/api-errors";
import { qrDestinationMessageKey } from "@/i18n/qr-labels";
import type { ApiErrorEnvelope, ManagedQRCode, QRWorkspaceSummary } from "@/lib/qr/client-types";

type ApiResponse = ApiErrorEnvelope & { data?: ManagedQRCode[]; summary?: QRWorkspaceSummary };
class LocalizedRequestError extends Error {}

export default function DashboardPage() {
  const { t, locale } = useI18n();
  const [records, setRecords] = useState<ManagedQRCode[]>([]);
  const [summary, setSummary] = useState<QRWorkspaceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/qrcodes?limit=5&offset=0", { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as ApiResponse;
        if (!response.ok) throw new LocalizedRequestError(localizedApiError(body, "error.couldNotLoadDashboard", t));
        if (active) {
          setRecords(body.data ?? []);
          setSummary(body.summary ?? null);
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof LocalizedRequestError ? reason.message : t("error.couldNotLoadDashboard"));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [t]);

  const scans = summary?.totalScans ?? records.reduce((total, record) => total + (record._count?.scanEvents ?? 0), 0);
  const activeCount = summary?.activeQrCodes ?? records.filter((record) => record.isActive && (!record.expiresAt || new Date(record.expiresAt).getTime() > Date.now())).length;
  const recent = records.slice(0, 5);
  const stats = [
    { label: t("dashboard.totalCodes"), value: summary?.totalQrCodes ?? records.length, accent: "bg-emerald-50 text-emerald-800", mark: "QR" },
    { label: t("dashboard.activeDestinations"), value: activeCount, accent: "bg-teal-50 text-teal-800", mark: "↗" },
    { label: t("dashboard.totalScans"), value: scans, accent: "bg-slate-100 text-faida-navy", mark: "◎" },
  ];

  return (
    <div className="space-y-7">
      <DashboardPageHeading
        eyebrow={t("dashboard.eyebrow")}
        title={t("dashboard.title")}
        description={t("dashboard.description")}
        action={<Link href="/dashboard/create" className="inline-flex items-center rounded-xl bg-faida-green px-4 py-3 text-sm font-bold text-faida-navy shadow-sm transition hover:bg-emerald-300">＋ {t("common.createQr")}</Link>}
      />

      {error ? <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">{error}</div> : null}

      <section className="grid gap-4 sm:grid-cols-3" aria-label={t("dashboard.workspaceTotals")}>
        {stats.map((stat) => (
          <article key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between"><p className="text-sm font-medium text-faida-slate">{stat.label}</p><span className={`grid h-9 min-w-9 place-items-center rounded-xl px-2 text-xs font-black ${stat.accent}`}>{stat.mark}</span></div>
            <p className="mt-5 text-3xl font-semibold tracking-tight text-faida-navy">{loading ? "—" : formatNumber(stat.value, locale)}</p>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-faida-teal">{t("dashboard.recentActivity")}</p><h2 className="mt-1 text-lg font-semibold text-faida-navy">{t("dashboard.recentlyUpdated")}</h2></div>
          <Link href="/dashboard/qrcodes" className="text-sm font-bold text-emerald-800 hover:underline">{t("common.viewAll")} {locale === "ar" ? "←" : "→"}</Link>
        </div>
        {recent.length ? (
          <div className="divide-y divide-slate-100">
            {recent.map((record) => (
              <div key={record.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
                <div className="min-w-0"><p className="truncate text-sm font-semibold text-faida-navy">{record.title}</p><p className="mt-1 truncate text-xs text-faida-slate">/{record.shortCode} · {qrDestinationMessageKey(record.destinationType) ? t(qrDestinationMessageKey(record.destinationType)!) : record.destinationType}</p></div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{formatNumber(record._count?.scanEvents ?? 0, locale)} {t("dashboard.scans")}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-10 text-center"><p className="font-semibold text-faida-navy">{t("dashboard.noCodesTitle")}</p><p className="mt-2 text-sm text-faida-slate">{t("dashboard.noCodesDescription")}</p><Link href="/dashboard/create" className="mt-4 inline-flex rounded-xl bg-faida-green px-4 py-2.5 text-sm font-bold text-faida-navy">{t("common.createQr")}</Link></div>
        )}
      </section>
    </div>
  );
}
