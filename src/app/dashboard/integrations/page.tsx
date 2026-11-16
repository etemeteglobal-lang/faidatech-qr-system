"use client";

import DashboardPageHeading from "@/components/dashboard/DashboardPageHeading";
import { useI18n } from "@/i18n/LocaleProvider";
import type { MessageKey } from "@/i18n/messages";

const integrations: { name: MessageKey; label: MessageKey; detail: MessageKey; status: MessageKey; mark: string; tone: string }[] = [
  { name: "integrations.authName", label: "integrations.authenticationLabel", detail: "integrations.authDetail", status: "integrations.connected", mark: "S", tone: "bg-faida-navy text-white" },
  { name: "integrations.telebirrName", label: "integrations.paymentLabel", detail: "integrations.telebirrDetail", status: "integrations.readyForMenu", mark: "T", tone: "bg-emerald-100 text-emerald-900" },
  { name: "integrations.contentName", label: "integrations.contentLabel", detail: "integrations.contentDetail", status: "integrations.urlBased", mark: "↗", tone: "bg-teal-100 text-teal-900" },
];

export default function IntegrationsPage() {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <DashboardPageHeading eyebrow={t("shell.workspaceSection")} title={t("integrations.title")} description={t("integrations.description")} />
      <div className="grid gap-4 xl:grid-cols-3">{integrations.map((integration) => <article key={integration.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><span className={`grid h-11 w-11 place-items-center rounded-2xl text-sm font-black ${integration.tone}`}>{integration.mark}</span><span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-faida-slate">{t(integration.status)}</span></div><p className="mt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-faida-teal">{t(integration.label)}</p><h2 className="mt-1 text-lg font-semibold text-faida-navy">{t(integration.name)}</h2><p className="mt-2 text-sm leading-6 text-faida-slate">{t(integration.detail)}</p></article>)}</div>
      <div className="rounded-2xl border border-teal-100 bg-teal-50/60 p-5 text-sm leading-6 text-teal-950"><strong>{t("integrations.paymentSafety")}:</strong> {t("integrations.paymentSafetyNote")}</div>
    </div>
  );
}
