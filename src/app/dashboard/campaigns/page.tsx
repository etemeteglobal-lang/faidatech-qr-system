"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DashboardPageHeading from "@/components/dashboard/DashboardPageHeading";
import { useI18n } from "@/i18n/LocaleProvider";
import { formatNumber } from "@/i18n/format";
import { localizedApiError } from "@/i18n/api-errors";
import type { ApiErrorEnvelope, ManagedQRCode } from "@/lib/qr/client-types";

type ApiResponse = ApiErrorEnvelope & { data?: ManagedQRCode[] };
class LocalizedRequestError extends Error {}

export default function CampaignsPage() {
  const { t, locale } = useI18n();
  const [records, setRecords] = useState<ManagedQRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/qrcodes?limit=100", { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as ApiResponse;
        if (!response.ok) throw new LocalizedRequestError(localizedApiError(body, "error.couldNotLoadCampaigns", t));
        if (active) setRecords(body.data ?? []);
      })
      .catch((reason: unknown) => { if (active) setError(reason instanceof LocalizedRequestError ? reason.message : t("error.couldNotLoadCampaigns")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [t]);

  const campaigns = useMemo(() => {
    const grouped = new Map<string, { name: string; status: string; count: number; scans: number }>();
    for (const record of records) {
      if (!record.campaign) continue;
      const group = grouped.get(record.campaign.id) ?? { name: record.campaign.name, status: record.campaign.status, count: 0, scans: 0 };
      group.count += 1;
      group.scans += record._count?.scanEvents ?? 0;
      grouped.set(record.campaign.id, group);
    }
    return [...grouped.entries()].map(([id, value]) => ({ id, ...value }));
  }, [records]);

  function campaignStatus(status: string): string {
    const normalized = status.toUpperCase();
    if (["ACTIVE", "RUNNING"].includes(normalized)) return t("status.active");
    if (normalized === "PAUSED") return t("status.paused");
    if (normalized === "EXPIRED") return t("status.expired");
    return t("common.unavailable");
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeading eyebrow={t("campaigns.eyebrow")} title={t("campaigns.title")} description={t("campaigns.description")} />
      {error ? <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</div> : null}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-semibold text-faida-navy">{t("campaigns.overview")}</h2><p className="mt-1 text-xs text-faida-slate">{t("campaigns.organizationScope")}</p></div><Link href="/dashboard/qrcodes" className="text-xs font-bold text-emerald-800 hover:underline">{t("campaigns.openLibrary")} {locale === "ar" ? "←" : "→"}</Link></div>
        {loading ? <p className="px-5 py-10 text-center text-sm text-faida-slate">{t("campaigns.loading")}</p> : campaigns.length ? <div className="divide-y divide-slate-100">{campaigns.map((campaign) => <article key={campaign.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"><div><h3 className="font-semibold text-faida-navy">{campaign.name}</h3><p className="mt-1 text-xs text-faida-slate">{campaignStatus(campaign.status)} · {t("campaigns.qrCount", { count: formatNumber(campaign.count, locale) })}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">{t("campaigns.scanCount", { count: formatNumber(campaign.scans, locale) })}</span></article>)}</div> : <div className="px-6 py-12 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-lg font-black text-faida-teal">C</span><h3 className="mt-4 font-semibold text-faida-navy">{t("campaigns.empty")}</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-faida-slate">{t("campaigns.emptyDescription")}</p><Link href="/dashboard/qrcodes" className="mt-4 inline-flex rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-faida-navy">{t("campaigns.viewCodes")}</Link></div>}
      </section>
    </div>
  );
}
