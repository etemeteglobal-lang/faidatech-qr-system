"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/i18n/LocaleProvider";

type Resource = { key: string; route: string; title: string; description: string; payload: string; protectedNote?: string };
type Envelope<T> = { data?: T; error?: { message?: string } };
const resources: Resource[] = [
  { key: "traceability", route: "traceability", title: "Product traceability", description: "Create a product with optional GTIN / GS1 Digital Link and JSONB origin metadata, or create a batch using an existing product ID.", payload: JSON.stringify({ kind: "PRODUCT", productCode: "COFFEE-001", gtin: "", digitalLink: "", name: "Origin coffee", originMetadata: { countryCode: "ET", region: "Oromia" }, customFields: {} }, null, 2) },
  { key: "verification", route: "verifications", title: "Credential verification hooks", description: "Create a pending Fayda, Mesob, or manual verification request using an opaque internal reference. Provider adapters are separate.", payload: JSON.stringify({ subjectType: "LICENSE", subjectReference: "LIC-ABC123", provider: "MANUAL", safeMetadata: {} }, null, 2), protectedNote: "Never enter raw Fayda/national ID numbers, passwords, tokens, or document images." },
  { key: "payments", route: "payment-links", title: "Payment attachments", description: "Attach a hosted checkout URL alongside existing Phase 1 Telebirr, Chapa, Stripe, or bank workflows. This does not modify subscription billing.", payload: JSON.stringify({ entityType: "BusinessProfile", entityId: "replace-with-entity-id", provider: "TELEBIRR", checkoutUrl: "https://payments.example/checkout", reference: "ORDER-123", currency: "ETB", amountMinor: 10000, metadata: {} }, null, 2) },
  { key: "assets", route: "assets", title: "CMMS asset register", description: "Register organization assets, tags, locations, manuals, parts, and metadata. Create the asset before recording maintenance.", payload: JSON.stringify({ assetTag: "PUMP-001", name: "Water pump", assetType: "EQUIPMENT", location: "Building A", manualUrl: "https://example.org/manual.pdf", parts: [], metadata: {} }, null, 2) },
  { key: "maintenance", route: "maintenance", title: "Maintenance and faults", description: "Record inspections, maintenance, part replacement, and faults by asset tag. Field agents can report only within their own organization scope.", payload: JSON.stringify({ assetTag: "PUMP-001", recordType: "INSPECTION", title: "Quarterly inspection", details: {}, faultReported: false }, null, 2) },
];

export default function EcosystemWorkspace() {
  const { t } = useI18n();
  const [selectedKey, setSelectedKey] = useState(resources[0].key);
  const [payload, setPayload] = useState(resources[0].payload);
  const [records, setRecords] = useState<unknown[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const selected = resources.find((item) => item.key === selectedKey)!;
  const labels: Record<string, string> = { traceability: t("ecosystem.traceability"), verification: t("ecosystem.verification"), payments: t("ecosystem.payments"), assets: t("ecosystem.cmms"), maintenance: "Maintenance history" };

  const load = useCallback(async () => {
    const response = await fetch(`/api/ecosystem/${selected.route}`, { cache: "no-store" });
    const body = await response.json() as Envelope<unknown[]>;
    if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Could not load records.");
    setRecords(body.data);
  }, [selected.route]);
  useEffect(() => { setPayload(selected.payload); setMessage(""); setRecords([]); void load().catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Could not load records.")); }, [load, selected.payload]);

  async function save() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/ecosystem/${selected.route}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(JSON.parse(payload)) });
      const body = await response.json() as Envelope<unknown>;
      if (!response.ok) throw new Error(body.error?.message ?? "Record could not be saved.");
      setMessage("Record saved within the active organization."); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Check the JSON payload and try again."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-6">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-800">{t("ecosystem.sharing")}</p><h1 className="mt-2 text-2xl font-bold">{t("ecosystem.title")}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{t("ecosystem.description")}</p><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{resources.map((item) => <button key={item.key} type="button" onClick={() => setSelectedKey(item.key)} className={`rounded-xl border p-4 text-start transition ${item.key === selectedKey ? "border-teal-700 bg-teal-50" : "border-slate-200 hover:bg-slate-50"}`}><span className="text-sm font-bold">{labels[item.key]}</span><p className="mt-1 text-xs leading-5 text-slate-600">{item.description}</p></button>)}</div></section>
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">{labels[selected.key]}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{selected.description}</p>{selected.protectedNote ? <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs font-semibold text-amber-900">{selected.protectedNote}</p> : null}<label className="mt-4 block text-sm font-semibold">Validated JSON request<textarea spellCheck={false} rows={15} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-mono text-xs leading-5" value={payload} onChange={(event) => setPayload(event.target.value)} /></label><button type="button" onClick={() => void save()} disabled={busy} className="mt-3 rounded-xl bg-faida-green px-4 py-2.5 text-sm font-bold disabled:opacity-50">{busy ? "Saving…" : "Save record"}</button></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">Recent organization records</h2><button type="button" onClick={() => void load().catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Could not refresh."))} className="rounded-lg border px-3 py-1.5 text-xs font-semibold">Refresh</button></div>{message ? <p role="status" className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">{message}</p> : null}<pre className="mt-4 max-h-[30rem] overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-5 text-emerald-100">{records.length ? JSON.stringify(records, null, 2) : "No records returned yet."}</pre></div></section>
    <p className="text-xs text-slate-500">Sensitive provider integrations are hooks only; no raw personal identifiers or provider credentials are stored by this page. Public shared-service records are managed separately.</p>
  </div>;
}
