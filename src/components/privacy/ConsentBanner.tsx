"use client";

import { useEffect, useState } from "react";

type Consent = "pending" | "necessary" | "analytics";
const CONSENT_KEY = "faidatech-consent-v1";
const RETENTION_KEY = "faidatech-analytics-retention-v1";

export default function ConsentBanner() {
  const [consent, setConsent] = useState<Consent>("pending");
  const [showControls, setShowControls] = useState(false);
  const [retention, setRetention] = useState("90");

  useEffect(() => {
    const saved = window.localStorage.getItem(CONSENT_KEY) as Consent | null;
    const savedRetention = window.localStorage.getItem(RETENTION_KEY);
    if (saved === "necessary" || saved === "analytics") setConsent(saved);
    if (savedRetention) setRetention(savedRetention);
  }, []);

  function save(next: Exclude<Consent, "pending">) {
    window.localStorage.setItem(CONSENT_KEY, next);
    window.localStorage.setItem(RETENTION_KEY, retention);
    setConsent(next);
    setShowControls(false);
    window.dispatchEvent(new CustomEvent("faidatech-consent-change", { detail: { analytics: next === "analytics", retentionDays: retention } }));
  }

  if (consent !== "pending" && !showControls) return null;
  return (
    <aside className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-2xl border border-slate-300 bg-white p-4 shadow-2xl" aria-label="Privacy and cookie settings">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-bold text-faida-navy">Privacy and analytics choices</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-700">FaidATech uses necessary cookies for sign-in and security. Optional analytics is off until you allow it. You can change this choice or clear local preferences at any time.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" onClick={() => save("necessary")} className="rounded-lg border border-slate-400 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100">Necessary only</button>
          <button type="button" onClick={() => save("analytics")} className="rounded-lg bg-emerald-800 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-900">Allow analytics</button>
          <button type="button" onClick={() => setShowControls((value) => !value)} className="rounded-lg px-3 py-2 text-xs font-bold text-emerald-900 underline">Settings</button>
        </div>
      </div>
      {showControls ? <div className="mt-3 flex flex-col gap-2 border-t border-slate-200 pt-3 text-xs text-slate-700 sm:flex-row sm:items-center sm:justify-between">
        <label htmlFor="analytics-retention" className="font-semibold">Optional analytics retention</label>
        <select id="analytics-retention" value={retention} onChange={(event) => setRetention(event.target.value)} className="rounded-lg border border-slate-400 bg-white px-2 py-2 text-slate-900">
          <option value="30">30 days</option><option value="90">90 days</option><option value="365">1 year</option>
        </select>
      </div> : null}
    </aside>
  );
}
