"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import DashboardPageHeading from "@/components/dashboard/DashboardPageHeading";
import { useI18n } from "@/i18n/LocaleProvider";
import { formatNumber } from "@/i18n/format";
import { localizedApiError } from "@/i18n/api-errors";
import { qrDestinationMessageKey } from "@/i18n/qr-labels";
import type { MessageKey } from "@/i18n/messages";
import type { ApiErrorEnvelope, ManagedQRCode, QRListPagination, QRWorkspaceSummary } from "@/lib/qr/client-types";

type ListResponse = ApiErrorEnvelope & { data?: ManagedQRCode[]; pagination?: QRListPagination; summary?: QRWorkspaceSummary };
class LocalizedRequestError extends Error {}

function statusOf(record: ManagedQRCode): "Active" | "Paused" | "Expired" {
  if (record.expiresAt && new Date(record.expiresAt).getTime() <= Date.now()) return "Expired";
  return record.isActive ? "Active" : "Paused";
}

function StatusPill({ status, t }: { status: ReturnType<typeof statusOf>; t: (key: MessageKey) => string }) {
  const style = status === "Active" ? "bg-emerald-50 text-emerald-800" : status === "Paused" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-800";
  const labelKey: MessageKey = status === "Active" ? "status.active" : status === "Paused" ? "status.paused" : "status.expired";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}><span className={`h-1.5 w-1.5 rounded-full ${status === "Active" ? "bg-faida-green" : status === "Paused" ? "bg-slate-400" : "bg-amber-500"}`} />{t(labelKey)}</span>;
}

export default function QRCodeManagement() {
  const { t, locale } = useI18n();
  const [records, setRecords] = useState<ManagedQRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [summary, setSummary] = useState<QRWorkspaceSummary | null>(null);
  const [pagination, setPagination] = useState<QRListPagination>({ limit: 50, offset: 0, totalCount: 0, nextOffset: null });
  const [busyId, setBusyId] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState("");
  const [notice, setNotice] = useState("");

  const loadRecords = useCallback(async (offset = 0, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "50", offset: String(offset) });
      if (search.trim()) params.set("search", search.trim());
      const response = await fetch(`/api/qrcodes?${params}`, { cache: "no-store" });
      const body = (await response.json().catch(() => ({}))) as ListResponse;
      if (!response.ok) throw new LocalizedRequestError(localizedApiError(body, "error.couldNotLoadQrCodes", t));
      const page = body.data ?? [];
      setRecords((current) => append ? [...current, ...page] : page);
      setSummary(body.summary ?? null);
      setPagination(body.pagination ?? { limit: 50, offset, totalCount: page.length, nextOffset: null });
    } catch (reason) {
      setError(reason instanceof LocalizedRequestError ? reason.message : t("error.general"));
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  }, [search, t]);

  useEffect(() => {
    const timer = setTimeout(() => { void loadRecords(0, false); }, search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [loadRecords, search]);

  async function toggleActive(record: ManagedQRCode) {
    setBusyId(record.id);
    setError("");
    try {
      const response = await fetch(`/api/qrcodes/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !record.isActive }),
      });
      const body = (await response.json().catch(() => ({}))) as ApiErrorEnvelope & { data?: ManagedQRCode };
      if (!response.ok) throw new LocalizedRequestError(localizedApiError(body, "error.couldNotUpdateQr", t));
      if (body.data) setRecords((current) => current.map((item) => item.id === record.id ? { ...item, ...body.data, _count: item._count } : item));
      await loadRecords(0, false);
    } catch (reason) {
      setError(reason instanceof LocalizedRequestError ? reason.message : t("error.general"));
    } finally {
      setBusyId("");
    }
  }

  async function softDelete(record: ManagedQRCode) {
    setBusyId(record.id);
    setError("");
    try {
      const response = await fetch(`/api/qrcodes/${record.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiErrorEnvelope;
        throw new LocalizedRequestError(localizedApiError(body, "error.couldNotRemoveQr", t));
      }
      setNotice(t("qr.softDeleteSuccess", { title: record.title }));
      setConfirmDeleteId("");
      await loadRecords(0, false);
    } catch (reason) {
      setError(reason instanceof LocalizedRequestError ? reason.message : t("error.general"));
    } finally {
      setBusyId("");
    }
  }

  async function copyShortLink(shortCode: string) {
    const publicUrl = new URL(`/r/${encodeURIComponent(shortCode)}`, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(publicUrl);
      setNotice(t("qr.copied"));
    } catch {
      setNotice(publicUrl);
    }
  }

  const activeCount = summary?.activeQrCodes ?? records.filter((record) => statusOf(record) === "Active").length;
  const scanCount = summary?.totalScans ?? records.reduce((total, record) => total + (record._count?.scanEvents ?? 0), 0);
  const totalCount = summary?.totalQrCodes ?? pagination.totalCount;
  const stats = [
    { label: t("qr.totalCodes"), value: totalCount },
    { label: t("qr.activeNow"), value: activeCount },
    { label: t("qr.recordedScans"), value: scanCount },
  ];

  return (
    <div className="space-y-6">
      <DashboardPageHeading eyebrow={t("shell.qrLibrary")} title={t("qr.libraryTitle")} description={t("qr.libraryDescription")} action={<Link href="/dashboard/create" className="inline-flex items-center justify-center rounded-xl bg-faida-green px-4 py-3 text-sm font-bold text-faida-navy shadow-sm transition hover:bg-emerald-300">＋ {t("common.createQr")}</Link>} />

      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white px-5 py-4"><p className="text-xs font-semibold text-faida-slate">{stat.label}</p><p className="mt-2 text-2xl font-semibold text-faida-navy">{loading ? "—" : formatNumber(stat.value, locale)}</p></div>)}
      </div>

      {error ? <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</div> : null}
      {notice ? <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</div> : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div><h2 className="font-semibold text-faida-navy">{t("qr.allDestinations")}</h2><p className="mt-1 text-xs text-faida-slate">{t("qr.showingMatching", { shown: formatNumber(records.length, locale), total: formatNumber(pagination.totalCount, locale) })}</p></div>
          <label className="relative block sm:w-72"><span className="sr-only">{t("common.search")}</span><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faida-slate rtl:left-auto rtl:right-3">⌕</span><input value={search} onChange={(event) => { setSearch(event.target.value); setLoading(true); setPagination((current) => ({ ...current, nextOffset: null })); }} placeholder={t("qr.searchPlaceholder")} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-emerald-400 focus:bg-white rtl:pl-3 rtl:pr-9" /></label>
        </div>

        {loading ? <div className="px-5 py-12 text-center text-sm text-faida-slate">{t("qr.loadingTenant")}</div> : records.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-[920px] w-full text-start text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500"><tr><th className="px-5 py-3">{t("qr.destination")}</th><th className="px-4 py-3">{t("qr.status")}</th><th className="px-4 py-3">{t("qr.scans")}</th><th className="px-4 py-3">{t("qr.shortcode")}</th><th className="px-4 py-3">{t("qr.format")}</th><th className="px-5 py-3 text-end">{t("qr.actions")}</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((record) => {
                  const status = statusOf(record);
                  const destinationKey = qrDestinationMessageKey(record.destinationType);
                  return (
                    <tr key={record.id} className="align-middle transition hover:bg-slate-50/70">
                      <td className="max-w-[260px] px-5 py-4"><p className="truncate font-semibold text-faida-navy">{record.title}</p><p className="mt-1 truncate text-xs text-faida-slate">{record.campaign?.name || (destinationKey ? t(destinationKey) : record.destinationType)}</p></td>
                      <td className="px-4 py-4"><StatusPill status={status} t={t} /></td>
                      <td className="px-4 py-4 tabular-nums text-faida-navy">{formatNumber(record._count?.scanEvents ?? 0, locale)}</td>
                      <td className="px-4 py-4"><button type="button" onClick={() => void copyShortLink(record.shortCode)} className="group text-start"><span className="font-mono text-xs font-semibold text-faida-navy">/{record.shortCode}</span><span className="ms-2 text-[10px] font-semibold text-emerald-800 opacity-0 transition group-hover:opacity-100">{t("qr.copy")}</span></button></td>
                      <td className="px-4 py-4"><div className="flex gap-1.5"><a href={`/api/qrcodes/${record.id}/image?format=svg`} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-faida-slate hover:border-emerald-300 hover:text-emerald-800">SVG</a><a href={`/api/qrcodes/${record.id}/image?format=png`} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-faida-slate hover:border-emerald-300 hover:text-emerald-800">PNG</a></div></td>
                      <td className="px-5 py-4"><div className="flex items-center justify-end gap-2"><Link href={`/dashboard/create?edit=${encodeURIComponent(record.id)}`} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-faida-slate hover:bg-slate-100 hover:text-faida-navy">{t("common.edit")}</Link>{status !== "Expired" ? <button type="button" disabled={busyId === record.id} onClick={() => void toggleActive(record)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-faida-slate hover:bg-slate-100 hover:text-faida-navy disabled:opacity-50">{record.isActive ? t("common.pause") : t("common.resume")}</button> : null}<button type="button" disabled={busyId === record.id} onClick={() => setConfirmDeleteId(record.id)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">{t("common.delete")}</button></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-xl font-bold text-faida-green">QR</span><h3 className="mt-4 font-semibold text-faida-navy">{search ? t("qr.noMatching") : t("qr.noCodes")}</h3><p className="mt-2 text-sm text-faida-slate">{search ? t("qr.libraryDescription") : t("dashboard.noCodesDescription")}</p>{!search ? <Link href="/dashboard/create" className="mt-4 inline-flex rounded-xl bg-faida-green px-4 py-2.5 text-sm font-bold text-faida-navy">{t("common.createQr")}</Link> : null}</div>
        )}
      </section>

      {!loading && pagination.nextOffset !== null ? <div className="flex justify-center"><button type="button" disabled={loadingMore} onClick={() => void loadRecords(pagination.nextOffset as number, true)} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-faida-navy shadow-sm transition hover:border-faida-teal hover:bg-teal-50/50 disabled:opacity-50">{loadingMore ? t("qr.loadingMore") : `${t("qr.loadMore")} (${t("qr.remaining", { count: formatNumber(Math.max(0, pagination.totalCount - records.length), locale) })})`}</button></div> : null}

      {confirmDeleteId ? (
        <div role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title" className="fixed inset-0 z-50 grid place-items-center bg-faida-navy/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-700">{t("qr.softDelete")}</p><h2 id="delete-dialog-title" className="mt-2 text-xl font-semibold text-faida-navy">{t("qr.deleteTitle")}</h2><p className="mt-2 text-sm leading-6 text-faida-slate">{t("qr.deleteDescription")}</p>
            <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setConfirmDeleteId("")} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-faida-slate">{t("common.cancel")}</button><button type="button" disabled={busyId === confirmDeleteId} onClick={() => { const record = records.find((item) => item.id === confirmDeleteId); if (record) void softDelete(record); }} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busyId === confirmDeleteId ? t("qr.removing") : t("qr.softDelete")}</button></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
