"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DashboardPageHeading from "@/components/dashboard/DashboardPageHeading";
import { useI18n } from "@/i18n/LocaleProvider";
import { localizedApiError } from "@/i18n/api-errors";
import type { ApiErrorEnvelope } from "@/lib/qr/client-types";

type Plan = { id: string; code: string; name: string; billingInterval: "MONTHLY" | "YEARLY"; currency: string; priceMinor: number; dynamicQrLimit: number; scanLimit: number; teamSeatLimit: number; customDomainLimit: number; active: boolean };
type BillingData = { current: { plan: Plan; subscription: { status: string; provider: string; currentPeriodEnd: string | null } | null; quota: { dynamicQrUsed: number; dynamicQrLimit: number; scansUsed: number; scansLimit: number; teamSeatsUsed: number; teamSeatLimit: number; customDomainsUsed: number; customDomainLimit: number } | null } | null; plans: Plan[] };
type BillingResponse = ApiErrorEnvelope & { data?: BillingData };
class LocalizedRequestError extends Error {}

function QuotaBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const percentage = limit < 0 ? 0 : Math.min(100, limit === 0 ? 100 : (used / limit) * 100);
  return <div><div className="mb-1 flex justify-between gap-3 text-xs font-semibold text-slate-700"><span>{label}</span><span>{limit < 0 ? `${used} / ∞` : `${used} / ${limit}`}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${percentage >= 90 ? "bg-rose-600" : "bg-emerald-700"}`} style={{ width: `${Math.max(percentage, used ? 3 : 0)}%` }} /></div></div>;
}

export default function BillingPage() {
  const { t } = useI18n();
  const [data, setData] = useState<BillingData | null>(null);
  const [error, setError] = useState("");
  const [provider, setProvider] = useState("telebirr");
  const [selectedPlan, setSelectedPlan] = useState("");
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/billing", { cache: "no-store" }).then(async (response) => {
      const body = (await response.json().catch(() => ({}))) as BillingResponse;
      if (!response.ok || !body.data) throw new LocalizedRequestError(localizedApiError(body, "billing.loadError", t));
      if (active) { setData(body.data); setSelectedPlan(body.data.plans.find((plan) => plan.code !== body.data?.current?.plan.code)?.id ?? body.data.plans[0]?.id ?? ""); }
    }).catch((reason: unknown) => { if (active) setError(reason instanceof LocalizedRequestError ? reason.message : t("billing.loadError")); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [t]);

  const plans = useMemo(() => data?.plans ?? [], [data]);
  async function startCheckout(plan: Plan) {
    setCheckoutLoading(plan.id); setNotice("");
    try {
      const response = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ planId: plan.id, billingInterval: plan.billingInterval.toLowerCase(), provider, currency: plan.currency, returnUrl: `${window.location.origin}/dashboard/billing`, cancelUrl: `${window.location.origin}/dashboard/billing` }) });
      const body = await response.json().catch(() => ({})) as BillingResponse & { data?: { checkoutUrl?: string; instructions?: string; status?: string } };
      if (!response.ok) throw new Error(localizedApiError(body, "billing.loadError", t));
      if (body.data?.checkoutUrl) window.open(body.data.checkoutUrl, "_self");
      else setNotice(body.data?.instructions ?? t("billing.pending"));
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : t("billing.loadError")); } finally { setCheckoutLoading(""); }
  }

  const current = data?.current;
  return <div className="space-y-7">
    <DashboardPageHeading eyebrow={t("common.workspace")} title={t("billing.title")} description={t("billing.description")} action={<Link href="/dashboard/settings" className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800">{t("nav.settings")}</Link>} />
    {error ? <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</div> : null}
    {notice ? <div role="status" className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-950">{notice}</div> : null}
    {current ? <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"><p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-800">{t("billing.currentPlan")}</p><h2 className="mt-2 text-2xl font-semibold text-faida-navy">{current.plan.name}</h2><p className="mt-2 text-sm text-slate-700">{current.plan.currency} {(current.plan.priceMinor / 100).toFixed(2)} · {current.plan.billingInterval === "MONTHLY" ? t("billing.monthly") : t("billing.yearly")}</p><p className="mt-5 text-sm font-semibold text-slate-800">{t("billing.status")}: <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-900">{current.subscription?.status ?? t("billing.pending")}</span></p></article>
      <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"><h2 className="text-lg font-semibold text-faida-navy">{t("billing.usage")}</h2>{current.quota ? <div className="mt-5 space-y-4"><QuotaBar label={t("billing.dynamicQrs")} used={current.quota.dynamicQrUsed} limit={current.quota.dynamicQrLimit} /><QuotaBar label={t("billing.scans")} used={current.quota.scansUsed} limit={current.quota.scansLimit} /><QuotaBar label={t("billing.teamSeats")} used={current.quota.teamSeatsUsed} limit={current.quota.teamSeatLimit} /><QuotaBar label={t("billing.customDomains")} used={current.quota.customDomainsUsed} limit={current.quota.customDomainLimit} /></div> : <p className="mt-4 text-sm text-slate-700">{t("billing.configNotice")}</p>}</article>
    </section> : loading ? <p className="text-sm text-slate-700">{t("billing.pending")}</p> : <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{t("billing.configNotice")}</div>}
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-800">{t("billing.availablePlans")}</p><h2 className="mt-2 text-xl font-semibold text-faida-navy">{t("billing.availablePlans")}</h2></div><label className="text-sm font-semibold text-slate-800">Payment provider<select value={provider} onChange={(event) => setProvider(event.target.value)} className="mt-1 block rounded-lg border border-slate-400 bg-white px-3 py-2"><option value="telebirr">Telebirr</option><option value="chapa">Chapa</option><option value="stripe">Stripe</option></select></label></div><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{plans.filter((plan) => plan.id !== current?.plan.id).map((plan) => <article key={plan.id} className="rounded-xl border border-slate-200 p-4"><h3 className="font-semibold text-faida-navy">{plan.name}</h3><p className="mt-1 text-sm text-slate-700">{plan.currency} {(plan.priceMinor / 100).toFixed(2)} · {plan.billingInterval === "MONTHLY" ? t("billing.monthly") : t("billing.yearly")}</p><button type="button" onClick={() => void startCheckout(plan)} disabled={checkoutLoading === plan.id} className="mt-4 rounded-lg bg-emerald-800 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{checkoutLoading === plan.id ? t("billing.pending") : t("billing.checkout")}</button></article>)}</div>{selectedPlan ? <span className="sr-only">{selectedPlan}</span> : null}</section>
  </div>;
}
