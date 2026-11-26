"use client";

import { useCallback, useEffect, useState } from "react";
import { formatFileSize } from "@/lib/profile/upload";

type StorageQuota = { storageBytesUsed: string; storageBytesLimit: string };

export default function StorageAllowanceIndicator() {
  const [quota, setQuota] = useState<StorageQuota | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const loadQuota = useCallback(async () => {
    try {
      const response = await fetch("/api/profile-assets", { cache: "no-store" });
      const body = await response.json() as { data?: StorageQuota };
      if (!response.ok || !body.data?.storageBytesUsed || !body.data.storageBytesLimit) throw new Error("Storage quota unavailable");
      setQuota(body.data);
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => {
    void loadQuota();
    window.addEventListener("faidatech:storage-quota-refresh", loadQuota);
    return () => window.removeEventListener("faidatech:storage-quota-refresh", loadQuota);
  }, [loadQuota]);

  if (loadFailed && !quota) return <p role="status" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">Workspace storage availability is temporarily unavailable.</p>;
  if (!quota) return <p role="status" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">Loading workspace storage allowance…</p>;

  const used = Math.max(0, Number(quota.storageBytesUsed) || 0);
  const limit = Math.max(0, Number(quota.storageBytesLimit) || 0);
  const remaining = Math.max(0, limit - used);
  const percentage = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return <section aria-label="Workspace storage allowance" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs">
      <p className="font-semibold text-faida-navy">Workspace storage</p>
      <p className="text-slate-600">{formatFileSize(used)} used of {formatFileSize(limit)} · {percentage}%</p>
    </div>
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label="Workspace storage used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}>
      <span className={`block h-full rounded-full ${percentage >= 100 ? "bg-rose-600" : "bg-teal-600"}`} style={{ width: `${percentage}%` }} />
    </div>
    <p className={`mt-2 text-xs font-semibold ${remaining === 0 ? "text-rose-700" : "text-emerald-800"}`}>{formatFileSize(remaining)} remaining</p>
  </section>;
}
