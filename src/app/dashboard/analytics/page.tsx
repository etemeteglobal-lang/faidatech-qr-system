"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DashboardPageHeading from "@/components/dashboard/DashboardPageHeading";
import { useI18n } from "@/i18n/LocaleProvider";
import { formatNumber } from "@/i18n/format";
import { localizedApiError } from "@/i18n/api-errors";
import type { ApiErrorEnvelope, QRWorkspaceSummary, TopScanQRCode } from "@/lib/qr/client-types";

type ApiResponse = ApiErrorEnvelope & { summary?: QRWorkspaceSummary; topScans?: TopScanQRCode[] };
class LocalizedRequestError extends Error {}

export default function AnalyticsPage() {
  const { t, locale } = useI18n();
  const [topScans, setTopScans] = useState<TopScanQRCode[]>([]);
  const [summary, setSummary] = useState<QRWorkspaceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/qrcodes?limit=1&offset=0", { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as ApiResponse;
        if (!response.ok) throw new LocalizedRequestError(localizedApiError(body, "error.couldNotLoadAnalytics", t));
        if (active) {
          setTopScans(body.topScans ?? []);
          setSummary(body.summary ?? null);
        }
      })
      .catch((reason: unknown) => { if (active) setError(reason instanceof LocalizedRequestError ? reason.message : t("error.couldNotLoadAnalytics")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [t]);

  const totalScans = summary?.totalScans ?? 0;
  const totalQrCodes = summary?.totalQrCodes ?? 0;
  const maxScans = useMemo(() => Math.max(1, ...topScans.map((record) => record.scanCount)), [topScans]);

  return (
    <div className="space-y-6">
      <DashboardPageHeading eyebrow={t("analytics.byDestination")} title={t("analytics.title")} description={t("analytics.description")} />
      {error ? <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</div> : null}
      <section className="rounded-[24px] bg-faida-navy p-6 text-white shadow-soft sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">{t("analytics.recordedScans")}</p><p className="mt-3 text-4xl font-semibold tabular-nums">{loading ? "—" : formatNumber(totalScans, locale)}</p><p className="mt-2 text-sm text-slate-300">{t("analytics.acrossDestinations", { count: formatNumber(totalQrCodes, locale) })}</p></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-faida-teal">{t("analytics.byDestination")}</p><h2 className="mt-1 text-lg font-semibold text-faida-navy">{t("analytics.distribution")}</h2></div><Link href="/dashboard/qrcodes" className="text-xs font-bold text-emerald-800 hover:underline">{t("analytics.manageCodes")} {locale === "ar" ? "←" : "→"}</Link></div>
        {loading ? <p className="py-8 text-center text-sm text-faida-slate">{t("analytics.loading")}</p> : topScans.length ? <div className="space-y-4">{topScans.map((record) => { const count = record.scanCount; return <div key={record.id}><div className="mb-1.5 flex items-center justify-between gap-4"><Link href={`/dashboard/create?edit=${encodeURIComponent(record.id)}`} className="truncate text-sm font-semibold text-faida-navy hover:underline">{record.title}</Link><span className="shrink-0 text-xs tabular-nums text-faida-slate">{formatNumber(count, locale)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-faida-green transition-all" style={{ width: `${Math.max(count ? 4 : 0, (count / maxScans) * 100)}%` }} /></div></div>; })}</div> : <p className="py-8 text-center text-sm text-faida-slate">{t("analytics.empty")}</p>}
      </section>
    </div>
  );
}
