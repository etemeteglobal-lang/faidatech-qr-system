"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useI18n } from "@/i18n/LocaleProvider";
import { localeMetadata } from "@/i18n/registry";
import type { MessageKey } from "@/i18n/messages";

type Lead = { id: string; customerName: string; businessName: string | null; email?: string | null; phone?: string | null; status: string; commissionBaseMinor: number; commissionAmountMinor: number; commissionCurrency: string; payoutStatus: string; agent?: { id: string; referralCode: string; user: { name: string | null } } };
type Agent = { id: string; referralCode: string; commissionRateBps: number; commissionCurrency: string; active: boolean; user?: { id: string; name: string | null; email: string | null }; _count?: { leads: number; payouts: number } };
type PortalData = { mode: "agent" | "admin"; agent?: Agent & { _count: { leads: number; payouts: number } }; leads?: Lead[]; agents?: Agent[]; totals: { leads?: number; commissionMinor?: number; agents?: number; pendingPayoutMinor?: number } };
type Envelope<T> = { data?: T; error?: { message?: string } };
const leadStates = ["NEW", "CONTACTED", "QUALIFIED", "ONBOARDING", "CONVERTED", "REJECTED"] as const;
const leadStatusKeys: Record<(typeof leadStates)[number], MessageKey> = { NEW: "agents.statusNew", CONTACTED: "agents.statusContacted", QUALIFIED: "agents.statusQualified", ONBOARDING: "agents.statusOnboarding", CONVERTED: "agents.statusConverted", REJECTED: "agents.statusRejected" };
const payoutStatusKeys: Record<string, MessageKey> = { PENDING: "agents.pending", APPROVED: "agents.payoutApproved", PAID: "agents.payoutPaid", HELD: "agents.payoutHeld" };

export default function AgentPortal() {
  const { t, locale } = useI18n();
  const [data, setData] = useState<PortalData | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [eligible, setEligible] = useState<Array<{ id: string; name: string | null; email: string | null }>>([]);
  const [agentId, setAgentId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [newAgentUser, setNewAgentUser] = useState("");
  const [newAgentRate, setNewAgentRate] = useState("0");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const [portalResponse, leadsResponse] = await Promise.all([fetch("/api/agents/me", { cache: "no-store" }), fetch("/api/agents/leads", { cache: "no-store" })]);
    const portalBody = await portalResponse.json() as Envelope<PortalData>;
    const leadsBody = await leadsResponse.json() as Envelope<Lead[]>;
    if (!portalResponse.ok || !portalBody.data) throw new Error(t("agents.loadError"));
    if (!leadsResponse.ok || !leadsBody.data) throw new Error(t("agents.loadError"));
    setData(portalBody.data);
    setLeads(leadsBody.data);
    if (portalBody.data.mode === "admin") {
      const eligibleResponse = await fetch("/api/agents?eligible=1", { cache: "no-store" });
      const eligibleBody = await eligibleResponse.json() as Envelope<Array<{ id: string; name: string | null; email: string | null }>>;
      if (eligibleResponse.ok && eligibleBody.data) setEligible(eligibleBody.data);
    }
  }, [t]);
  useEffect(() => { void load().catch((error: unknown) => setMessage(error instanceof Error ? error.message : t("agents.loadError"))); }, [load, t]);

  function money(minor: number, currency = "ETB") {
    try { return new Intl.NumberFormat(localeMetadata[locale].formattingLocale, { style: "currency", currency }).format((minor || 0) / 100); }
    catch { return `${currency} ${((minor || 0) / 100).toFixed(2)}`; }
  }
  async function requestJson(url: string, method: string, payload: unknown) {
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json() as Envelope<unknown>;
    if (!response.ok) throw new Error(t("agents.requestFailed"));
  }
  async function saveLead(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try { await requestJson("/api/agents/leads", "POST", { ...(data?.mode === "admin" ? { agentId } : {}), customerName, businessName: businessName || undefined, email: email || undefined, phone: phone || undefined }); setCustomerName(""); setBusinessName(""); setEmail(""); setPhone(""); setMessage(t("agents.leadRecorded")); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : t("agents.leadSaveFailed")); }
    finally { setBusy(false); }
  }
  async function createAgent(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try { await requestJson("/api/agents", "POST", { userId: newAgentUser, commissionRateBps: Math.round(Number(newAgentRate) * 100), commissionCurrency: "ETB" }); setMessage(t("agents.accountEnabled")); setNewAgentUser(""); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : t("agents.accountCreateFailed")); }
    finally { setBusy(false); }
  }
  async function updateLead(id: string, patch: Record<string, unknown>) {
    setBusy(true); setMessage("");
    try { await requestJson(`/api/agents/leads/${encodeURIComponent(id)}`, "PATCH", patch); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : t("agents.leadUpdateFailed")); }
    finally { setBusy(false); }
  }
  async function updateAgent(agent: Agent, patch: Record<string, unknown>) {
    setBusy(true); setMessage("");
    try { await requestJson(`/api/agents/${encodeURIComponent(agent.id)}`, "PATCH", patch); setMessage(t("agents.settingsUpdated")); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : t("agents.agentUpdateFailed")); }
    finally { setBusy(false); }
  }
  const isAdmin = data?.mode === "admin";

  return <div className="space-y-6">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-800">FaidATech · {t("agents.fieldOperations")}</p><h1 className="mt-2 text-2xl font-bold">{t("agents.title")}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{t("agents.description")}</p>
      {data?.mode === "agent" && data.agent ? <div className="mt-5 grid gap-3 sm:grid-cols-3"><Stat label={t("agents.referralCode")} value={data.agent.referralCode}/><Stat label={t("agents.collectionCount")} value={String(data.totals.leads ?? 0)}/><Stat label={t("agents.commissionRate")} value={`${(data.agent.commissionRateBps / 100).toLocaleString(localeMetadata[locale].formattingLocale)}%`}/></div> : null}
      {isAdmin ? <div className="mt-5 grid gap-3 sm:grid-cols-3"><Stat label={t("agents.agentCount")} value={String(data?.totals.agents ?? 0)}/><Stat label={t("agents.leads")} value={String(data?.totals.leads ?? 0)}/><Stat label={t("agents.pendingPayoutTotal")} value={money(data?.totals.pendingPayoutMinor ?? 0)}/></div> : null}
    </section>
    {data?.mode === "agent" && data.agent ? <section className="rounded-2xl border border-teal-200 bg-teal-50 p-5"><h2 className="font-bold">{t("agents.referralLinkTitle")}</h2><p className="mt-2 text-sm leading-6 text-teal-950">{t("agents.referralLinkHint")} <code className="rounded bg-white px-2 py-1 font-bold">{data.agent.referralCode}</code> {t("agents.referralLinkNote")}</p></section> : null}
    <section className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <form onSubmit={saveLead} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">{t("agents.addLead")}</h2>{isAdmin ? <label className="block text-sm font-medium">{t("agents.agentLabel")}<select required value={agentId} onChange={(event) => setAgentId(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3"><option value="">{t("agents.chooseAgent")}</option>{(data?.agents ?? []).filter((agent) => agent.active).map((agent) => <option key={agent.id} value={agent.id}>{agent.user?.name || agent.user?.email || agent.referralCode}</option>)}</select></label> : null}
        <Field label={t("agents.customerName")} value={customerName} onChange={setCustomerName} required/><Field label={t("agents.businessName")} value={businessName} onChange={setBusinessName}/><Field label={t("agents.email")} value={email} onChange={setEmail} type="email"/><Field label={t("agents.phone")} value={phone} onChange={setPhone}/><button disabled={busy} className="rounded-xl bg-faida-green px-4 py-2.5 text-sm font-bold disabled:opacity-50">{busy ? t("common.loading") : t("agents.saveLead")}</button>
      </form>
      {isAdmin ? <form onSubmit={createAgent} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">{t("agents.provisionTitle")}</h2><p className="text-sm text-slate-600">{t("agents.memberRoleHint")}</p><label className="block text-sm font-medium">{t("agents.organizationMember")}<select required value={newAgentUser} onChange={(event) => setNewAgentUser(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3"><option value="">{t("agents.chooseMember")}</option>{eligible.map((member) => <option key={member.id} value={member.id}>{member.name || member.email || member.id}</option>)}</select></label><label className="block text-sm font-medium">{t("agents.commissionPercent")}<input type="number" min="0" max="100" step="0.01" value={newAgentRate} onChange={(event) => setNewAgentRate(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3"/></label><button disabled={busy || !eligible.length} className="rounded-xl bg-faida-green px-4 py-2.5 text-sm font-bold disabled:opacity-50">{busy ? t("common.loading") : t("agents.enableAgent")}</button></form> : <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600"><h2 className="text-lg font-bold text-slate-900">{t("agents.onboardingTitle")}</h2><p className="mt-2">{t("agents.onboardingHint")}</p></div>}
    </section>
    {isAdmin ? <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">{t("agents.controlsTitle")}</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{(data?.agents ?? []).map((agent) => <AgentControl key={agent.id} agent={agent} busy={busy} onSave={(patch) => void updateAgent(agent, patch)} t={t}/>)}</div></section> : null}
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">{t("agents.leads")}</h2><div className="mt-4 space-y-3">{leads.map((lead) => <article key={lead.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{lead.customerName}{lead.businessName ? ` · ${lead.businessName}` : ""}</h3><p className="mt-1 text-xs text-slate-500">{lead.agent ? `${lead.agent.user.name ?? lead.agent.referralCode} · ` : ""}{lead.email ?? ""} {lead.phone ?? ""}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{t(leadStatusKeys[lead.status as keyof typeof leadStatusKeys] ?? "agents.statusNew")}</span></div><div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600"><span>{t("agents.payoutStatus")}: <b>{t(payoutStatusKeys[lead.payoutStatus] ?? "agents.pending")}</b></span><span>{t("agents.commission")}: <b>{money(lead.commissionAmountMinor, lead.commissionCurrency)}</b></span></div>{isAdmin ? <div className="mt-3 flex flex-wrap items-end gap-2"><label className="text-xs font-semibold">{t("agents.statusLabel")}<select className="mt-1 block rounded-lg border border-slate-300 p-2" value={lead.status} onChange={(event) => void updateLead(lead.id, { status: event.target.value })}>{leadStates.map((state) => <option key={state} value={state}>{t(leadStatusKeys[state])}</option>)}</select></label><label className="text-xs font-semibold">{t("agents.commissionBase")}<input type="number" min="0" max="20000000" step="0.01" defaultValue={(lead.commissionBaseMinor / 100).toFixed(2)} id={`base-${lead.id}`} className="mt-1 block w-36 rounded-lg border border-slate-300 p-2"/></label><button type="button" className="rounded-lg border px-3 py-2 text-xs font-semibold" disabled={busy} onClick={() => { const value = Number((document.getElementById(`base-${lead.id}`) as HTMLInputElement | null)?.value ?? 0); void updateLead(lead.id, { commissionBaseMinor: Math.round(value * 100), status: "CONVERTED" }); }}>{t("agents.convertAndCalculate")}</button>{lead.payoutStatus === "PENDING" ? <><button type="button" className="rounded-lg border px-3 py-2 text-xs font-semibold" disabled={busy} onClick={() => void updateLead(lead.id, { payoutStatus: "APPROVED" })}>{t("agents.approvePayout")}</button><button type="button" className="rounded-lg border px-3 py-2 text-xs font-semibold" disabled={busy} onClick={() => void updateLead(lead.id, { payoutStatus: "HELD" })}>{t("agents.holdPayout")}</button></> : null}{lead.payoutStatus === "APPROVED" ? <button type="button" className="rounded-lg border px-3 py-2 text-xs font-semibold" disabled={busy} onClick={() => void updateLead(lead.id, { payoutStatus: "PAID" })}>{t("agents.markPaid")}</button> : null}{lead.payoutStatus === "HELD" ? <button type="button" className="rounded-lg border px-3 py-2 text-xs font-semibold" disabled={busy} onClick={() => void updateLead(lead.id, { payoutStatus: "APPROVED" })}>{t("agents.releaseHold")}</button> : null}</div> : <button type="button" className="mt-3 rounded-lg border px-3 py-1.5 text-xs font-semibold" disabled={busy || lead.status === "CONTACTED"} onClick={() => void updateLead(lead.id, { status: "CONTACTED" })}>{t("agents.markContacted")}</button>}</article>)}{!leads.length ? <p className="text-sm text-slate-500">{t("agents.noLeads")}</p> : null}</div></section>
    {message ? <p role="status" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">{message}</p> : null}
  </div>;
}

function Field({ label, value, onChange, required = false, type = "text" }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string }) { return <label className="block text-sm font-medium">{label}<input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3"/></label>; }
function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 break-words text-lg font-bold text-slate-900">{value}</p></div>; }
function AgentControl({ agent, busy, onSave, t }: { agent: Agent; busy: boolean; onSave: (patch: Record<string, unknown>) => void; t: (key: MessageKey, values?: Record<string, string | number>) => string }) {
  const [rate, setRate] = useState(String(agent.commissionRateBps / 100));
  useEffect(() => setRate(String(agent.commissionRateBps / 100)), [agent.commissionRateBps]);
  return <article className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{agent.user?.name || agent.user?.email || agent.referralCode}</h3><p className="text-xs text-slate-500">{agent.referralCode} · {t("agents.leadCount", { count: agent._count?.leads ?? 0 })}</p></div><span className={`rounded-full px-2 py-1 text-xs font-bold ${agent.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{agent.active ? t("agents.active") : t("agents.inactive")}</span></div><div className="mt-3 flex flex-wrap items-end gap-2"><label className="text-xs font-semibold">{t("agents.commissionPercent")}<input type="number" min="0" max="100" step="0.01" value={rate} onChange={(event) => setRate(event.target.value)} className="mt-1 block w-36 rounded-lg border border-slate-300 p-2"/></label><button type="button" disabled={busy} onClick={() => onSave({ commissionRateBps: Math.round(Number(rate) * 100) })} className="rounded-lg border px-3 py-2 text-xs font-semibold">{t("agents.saveRate")}</button><button type="button" disabled={busy} onClick={() => onSave({ active: !agent.active })} className="rounded-lg border px-3 py-2 text-xs font-semibold">{agent.active ? t("agents.pauseAgent") : t("agents.reactivateAgent")}</button></div></article>;
}
