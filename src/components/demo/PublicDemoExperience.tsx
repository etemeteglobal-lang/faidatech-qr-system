"use client";

import Link from "next/link";
import { useState } from "react";
import LanguageSelector from "@/i18n/LanguageSelector";
import { useI18n } from "@/i18n/LocaleProvider";
import { formatETB, formatNumber } from "@/i18n/format";
import type { MessageKey } from "@/i18n/messages";

type DemoTab = "overview" | "codes" | "analytics";
type DemoRecord = {
  title: string;
  shortCode: string;
  purposeKey: MessageKey;
  statusKey: "status.active" | "status.paused";
  scans: number;
};

const records = [
  { title: "Example Coffee House", shortCode: "DEMO-001", purposeKey: "purpose.menu", statusKey: "status.active", scans: 431 },
  { title: "Heritage Audio Trail", shortCode: "DEMO-002", purposeKey: "purpose.tourism", statusKey: "status.active", scans: 286 },
  { title: "Sample Contact Card", shortCode: "DEMO-003", purposeKey: "purpose.vcard", statusKey: "status.paused", scans: 157 },
  { title: "Community Events", shortCode: "DEMO-004", purposeKey: "purpose.landing", statusKey: "status.active", scans: 94 },
] as const satisfies readonly DemoRecord[];

const tabs = [
  { id: "overview", labelKey: "nav.dashboard" },
  { id: "codes", labelKey: "nav.qrcodes" },
  { id: "analytics", labelKey: "nav.analytics" },
] as const satisfies readonly { id: DemoTab; labelKey: MessageKey }[];

const metrics = [
  { labelKey: "dashboard.totalCodes", value: records.length },
  { labelKey: "dashboard.activeDestinations", value: records.filter((record) => record.statusKey === "status.active").length },
  { labelKey: "dashboard.totalScans", value: records.reduce((sum, record) => sum + record.scans, 0) },
] as const satisfies readonly { labelKey: MessageKey; value: number }[];

function BrandMark() {
  return (
    <span className="grid h-10 w-10 grid-cols-2 gap-1 rounded-xl bg-faida-navy p-2 shadow-soft" aria-hidden="true">
      <span className="rounded-sm bg-faida-green" />
      <span className="rounded-sm border-2 border-white" />
      <span className="rounded-sm border-2 border-white" />
      <span className="rounded-sm bg-faida-teal" />
    </span>
  );
}

export default function PublicDemoExperience() {
  const { locale, direction, t } = useI18n();
  const [activeTab, setActiveTab] = useState<DemoTab>("overview");

  return (
    <main dir={direction} className="min-h-screen bg-[#f7faf9] text-faida-navy">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-8 lg:px-12">
          <Link href="/" className="flex items-center gap-3" aria-label={`FaidATech ${t("common.home")}`}>
            <BrandMark />
            <span>
              <strong className="block text-sm font-extrabold tracking-tight">FaidATech</strong>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-faida-slate">{t("app.qrOperations")}</span>
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <LanguageSelector compact />
            <Link href="/" className="rounded-lg px-3 py-2 text-xs font-semibold text-faida-slate transition hover:bg-slate-100 hover:text-faida-navy">{t("common.home")}</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 lg:px-12">
        <aside lang="en" dir="ltr" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950" role="note">
          Public demo · synthetic sample data only · read-only · no organization records or database access.
        </aside>

        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-faida-teal">{t("dashboard.eyebrow")}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-faida-navy sm:text-4xl">{t("dashboard.title")}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-faida-slate sm:text-base">{t("dashboard.description")}</p>
          </div>
          <Link href="/login" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-faida-navy shadow-sm transition hover:border-faida-teal hover:bg-teal-50">{t("common.signIn")}</Link>
        </div>

        <div role="tablist" aria-label={t("shell.mainNavigation")} className="mb-6 flex max-w-full gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              id={`demo-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls="demo-tab-panel"
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${activeTab === tab.id ? "bg-emerald-50 text-emerald-900" : "text-faida-slate hover:bg-slate-50 hover:text-faida-navy"}`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        <section id="demo-tab-panel" role="tabpanel" aria-labelledby={`demo-tab-${activeTab}`}>
          {activeTab === "overview" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                {metrics.map((metric) => (
                  <article key={metric.labelKey} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft">
                    <p className="text-sm font-medium text-faida-slate">{t(metric.labelKey)}</p>
                    <p className="mt-3 text-3xl font-bold tabular-nums text-faida-navy">{formatNumber(metric.value, locale)}</p>
                    <p className="mt-2 text-xs text-slate-400">{t("dashboard.workspaceTotals")}</p>
                  </article>
                ))}
              </div>

              <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-soft">
                  <div className="border-b border-slate-100 px-5 py-4">
                    <h2 className="text-base font-semibold text-faida-navy">{t("dashboard.recentlyUpdated")}</h2>
                  </div>
                  <DemoRecordTable locale={locale} />
                </section>

                <aside className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-faida-teal">{t("visitor.connectedExperience")}</p>
                  <h2 className="mt-2 text-lg font-semibold text-faida-navy">{t("visitor.todayMenu")}</h2>
                  <p lang="en" className="mt-1 text-sm text-faida-slate">Example Coffee House</p>
                  <ul className="mt-5 space-y-3">
                    <li className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 text-sm"><span lang="en">Coffee ceremony set</span><span className="font-semibold tabular-nums">{formatETB(180, locale)}</span></li>
                    <li className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 text-sm"><span lang="en">Honey loaf</span><span className="font-semibold tabular-nums">{formatETB(95, locale)}</span></li>
                    <li className="flex items-center justify-between gap-3 text-sm"><span lang="en">Spiced tea</span><span className="font-semibold tabular-nums">{formatETB(70, locale)}</span></li>
                  </ul>
                  <p className="mt-5 border-t border-slate-100 pt-4 text-xs text-faida-slate">{t("visitor.poweredBy")}</p>
                </aside>
              </div>
            </>
          ) : activeTab === "codes" ? (
            <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-soft">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-lg font-semibold text-faida-navy">{t("qr.libraryTitle")}</h2>
                <p className="mt-1 text-sm text-faida-slate">{t("qr.libraryDescription")}</p>
              </div>
              <DemoRecordTable locale={locale} />
            </section>
          ) : (
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft sm:p-7">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-faida-teal">{t("analytics.distribution")}</p>
              <h2 className="mt-2 text-2xl font-semibold text-faida-navy">{t("analytics.title")}</h2>
              <p className="mt-2 text-sm text-faida-slate">{t("analytics.description")}</p>
              <div className="mt-6 space-y-5">
                {records.map((record) => {
                  const share = Math.round((record.scans / metrics[2].value) * 100);
                  return (
                    <div key={record.shortCode}>
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="font-medium text-faida-navy">{t(record.purposeKey)}</span>
                        <span className="tabular-nums text-faida-slate">{formatNumber(record.scans, locale)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={t(record.purposeKey)} aria-valuemin={0} aria-valuemax={100} aria-valuenow={share}>
                        <div className="h-full rounded-full bg-faida-green" style={{ width: `${share}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-7 border-t border-slate-100 pt-4 text-sm text-faida-slate">{t("analytics.recordedScans")}: <strong className="text-faida-navy">{formatNumber(metrics[2].value, locale)}</strong></p>
            </section>
          )}
        </section>

        <footer className="mt-8 border-t border-slate-200 pt-4 text-xs text-faida-slate">
          <span lang="en" dir="ltr">Sample names and numbers are fictional. This page is for interface evaluation only and cannot create or modify QR codes.</span>
        </footer>
      </div>
    </main>
  );
}

function DemoRecordTable({ locale }: { locale: import("@/i18n/registry").LocaleCode }) {
  const { t } = useI18n();
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] border-collapse text-start text-sm">
        <thead className="bg-slate-50 text-xs font-semibold text-faida-slate">
          <tr>
            <th scope="col" className="px-5 py-3">{t("qr.destination")}</th>
            <th scope="col" className="px-5 py-3">{t("qr.shortcode")}</th>
            <th scope="col" className="px-5 py-3">{t("qr.status")}</th>
            <th scope="col" className="px-5 py-3 text-end">{t("qr.recordedScans")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {records.map((record) => (
            <tr key={record.shortCode}>
              <td className="px-5 py-4">
                <span lang="en" className="block font-semibold text-faida-navy">{record.title}</span>
                <span className="mt-1 block text-xs text-faida-slate">{t(record.purposeKey)}</span>
              </td>
              <td className="px-5 py-4"><code dir="ltr" className="rounded bg-slate-50 px-2 py-1 text-xs text-faida-slate">{record.shortCode}</code></td>
              <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${record.statusKey === "status.active" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>{t(record.statusKey)}</span></td>
              <td className="px-5 py-4 text-end tabular-nums text-faida-navy">{formatNumber(record.scans, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
