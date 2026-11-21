"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useI18n } from "@/i18n/LocaleProvider";

type Lead = { id: string; customerName: string; businessName: string | null; email?: string | null; phone?: string | null; status: string; commissionBaseMinor: number; commissionAmountMinor: number; commissionCurrency: string; payoutStatus: string; agent?: { id: string; referralCode: string; user: { name: string | null } } };
type Agent = { id: string; referralCode: string; commissionRateBps: number; commissionCurrency: string; active: boolean; user?: { id: string; name: string | null; email: string | null }; _count?: { leads: number; payouts: number } };
type PortalData = { mode: "agent" | "admin"; agent?: Agent & { _count: { leads: number; payouts: number } }; leads?: Lead[]; agents?: Agent[]; totals: { leads?: number; commissionMinor?: number; agents?: number; pendingPayoutMinor?: number } };
type Envelope<T> = { data?: T; error?: { message?: string } };
const leadStates = ["NEW", "CONTACTED", "QUALIFIED", "ONBOARDING", "CONVERTED", "REJECTED"];

export default function AgentPortal() {
  const { t } = useI18n();
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
    if (!portalResponse.ok || !portalBody.data) throw new Error(portalBody.error?.message ?? t("agents.loadError"));
    if (!leadsResponse.ok || !leadsBody.data) throw new Error(leadsBody.error?.message ?? t("agents.loadError"));
    setData(portalBody.data); setLeads(leadsBody.data);
    if (portalBody.data.mode === "admin") {
      const eligibleResponse = await fetch("/api/agents?eligible=1", { cache: "no-store" });
      const eligibleBody = await eligibleResponse.json() as Envelope<Array<{ id: string; name: string | null; email: string | null }>>;
      if (eligibleResponse.ok && eligibleBody.data) setEligible(eligibleBody.data);
    }
  }, [t]);
  useEffect(() => { void load().catch((error: unknown) => setMessage(error instanceof Error ? error.message : t("agents.loadError"))); }, [load, t]);

  async function requestJson(url: string, method: string, payload: unknown) {
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json() as Envelope<unknown>;
    if (!response.ok) throw new Error(body.error?.message ?? "Request failed.");
  }
  async function saveLead(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try { await requestJson("/api/agents/leads", "POST", { ...(data?.mode === "admin" ? { agentId } : {}), customerName, businessName: businessName || undefined, email: email || undefined, phone: phone || undefined }); setCustomerName(""); setBusinessName(""); setEmail(""); setPhone(""); setMessage("Lead recorded."); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not save lead."); } finally { setBusy(false); }
  }
  async function createAgent(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try { await requestJson("/api/agents", "POST", { userId: newAgentUser, commissionRateBps: Number(newAgentRate), commissionCurrency: "ETB" }); setMessage("Agent account enabled."); setNewAgentUser(""); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not create agent."); } finally { setBusy(false); }
  }
  async function updateLead(id: string, patch: Record<string, unknown>) {
    setBusy(true); try { await requestJson(`/api/agents/leads/${encodeURIComponent(id)}`, "PATCH", patch); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : "Lead update failed."); } finally { setBusy(false); }
  }
  async function updateAgent(agent: Agent, patch: Record<string, unknown>) {
    setBusy(true); try { await requestJson(`/api/agents/${encodeURIComponent(agent.id)}`, "PATCH", patch); setMessage("Agent settings updated."); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : "Agent update failed."); } finally { setBusy(false); }
  }
  const isAdmin = data?.mode === "admin";

  return <div className="space-y-6">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-800">FaidATech · Field operations</p><h1 className="mt-2 text-2xl font-bold">{t("agents.title")}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{t("agents.description")}</p>
      {data?.mode === "agent" && data.agent ? <div className="mt-5 grid gap-3 sm:grid-cols-3"><Stat label={t("agents.referralCode")} value={data.agent.referralCode}/><Stat label={t("agents.collectionCount")} value={String(data.totals.leads ?? 0)}/><Stat label={t("agents.commissionRate")} value={`${data.agent.commissionRateBps} bps`}/></div> : null}
      {isAdmin ? <div className="mt-5 grid gap-3 sm:grid-cols-3"><Stat label="Agents" value={String(data?.totals.agents ?? 0)}/><Stat label={t("agents.leads")} value={String(data?.totals.leads ?? 0)}/><Stat label={t("agents.payoutStatus")} value={`${data?.totals.pendingPayoutMinor ?? 0} ETB minor units`}/></div> : null}
    </section>
    {data?.mode === "agent" && data.agent ? <section className="rounded-2xl border border-teal-200 bg-teal-50 p-5"><h2 className="font-bold">Your referral link</h2><p className="mt-2 text-sm text-teal-950">Use referral code <code className="rounded bg-white px-2 py-1 font-bold">{data.agent.referralCode}</code> when recording an organization onboarding lead. Commission and payout changes are managed by your organization admin.</p></section> : null}
    <section className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <form onSubmit={saveLead} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">{t("agents.addLead")}</h2>{isAdmin ? <label className="block text-sm font-medium">Agent<select required value={agentId} onChange={(event) => setAgentId(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3"><option value="">Choose agent</option>{(data?.agents ?? []).filter((agent) => agent.active).map((agent) => <option key={agent.id} value={agent.id}>{agent.user?.name || agent.user?.email || agent.referralCode}</option>)}</select></label> : null}
        <Field label={t("agents.customerName")} value={customerName} onChange={setCustomerName} required/><Field label={t("agents.businessName")} value={businessName} onChange={setBusinessName}/><Field label={t("agents.email")} value={email} onChange={setEmail} type="email"/><Field label={t("agents.phone")} value={phone} onChange={setPhone}/><button disabled={busy} className="rounded-xl bg-faida-green px-4 py-2.5 text-sm font-bold disabled:opacity-50">{busy ? "Saving…" : t("agents.saveLead")}</button>
      </form>
      {isAdmin ? <form onSubmit={createAgent} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Provision field agent</h2><p className="text-sm text-slate-600">Choose an existing organization member. Their role is changed to AGENT.</p><label className="block text-sm font-medium">Organization member<select required value={newAgentUser} onChange={(event) => setNewAgentUser(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3"><option value="">Choose member</option>{eligible.map((member) => <option key={member.id} value={member.id}>{member.name || member.email || member.id}</option>)}</select></label><label className="block text-sm font-medium">Commission rate (basis points)<input type="number" min="0" max="10000" step="1" value={newAgentRate} onChange={(event) => setNewAgentRate(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3"/></label><button disabled={busy || !eligible.length} className="rounded-xl bg-faida-green px-4 py-2.5 text-sm font-bold disabled:opacity-50">Enable agent</button></form> : <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600"><h2 className="text-lg font-bold text-slate-900">Onboarding workflow</h2><p className="mt-2">Track each referral through new, contacted, qualified, and onboarding states. Only organization administrators can mark conversions, calculate commissions, or change payout status.</p></div>}
    </section>
    {isAdmin ? <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Agent controls</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{(data?.agents ?? []).map((agent) => <AgentControl key={agent.id} agent={agent} busy={busy} onSave={(patch) => void updateAgent(agent, patch)}/>)}</div></section> : null}
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">{t("agents.leads")}</h2><div className="mt-4 space-y-3">{leads.map((lead) => <article key={lead.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{lead.customerName}{lead.businessName ? ` · ${lead.businessName}` : ""}</h3><p className="mt-1 text-xs text-slate-500">{lead.agent ? `${lead.agent.user.name ?? lead.agent.referralCode} · ` : ""}{lead.email ?? ""} {lead.phone ?? ""}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{lead.status.replaceAll("_", " ")}</span></div><div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600"><span>{t("agents.payoutStatus")}: <b>{lead.payoutStatus}</b></span><span>Commission: <b>{lead.commissionAmountMinor} {lead.commissionCurrency} minor units</b></span></div>{isAdmin ? <div className="mt-3 flex flex-wrap items-end gap-2"><label className="text-xs font-semibold">Status<select className="mt-1 block rounded-lg border border-slate-300 p-2" value={lead.status} onChange={(event) => void updateLead(lead.id, { status: event.target.value })}>{leadStates.map((state) => <option key={state} value={state}>{state}</option>)}</select></label><label className="text-xs font-semibold">Commission base (minor)<input type="number" min="0" max="2000000000" defaultValue={lead.commissionBaseMinor} id={`base-${lead.id}`} className="mt-1 block w-36 rounded-lg border border-slate-300 p-2"/></label><button className="rounded-lg border px-3 py-2 text-xs font-semibold" disabled={busy} onClick={() => { const value = Number((document.getElementById(`base-${lead.id}`) as HTMLInputElement | null)?.value ?? 0); void updateLead(lead.id, { commissionBaseMinor: value, status: "CONVERTED" }); }}>Convert & calculate</button>{lead.payoutStatus === "PENDING" ? <><button className="rounded-lg border px-3 py-2 text-xs font-semibold" disabled={busy} onClick={() => void updateLead(lead.id, { payoutStatus: "APPROVED" })}>Approve payout</button><button className="rounded-lg border px-3 py-2 text-xs font-semibold" disabled={busy} onClick={() => void updateLead(lead.id, { payoutStatus: "HELD" })}>Hold payout</button></> : null}{lead.payoutStatus === "APPROVED" ? <button className="rounded-lg border px-3 py-2 text-xs font-semibold" disabled={busy} onClick={() => void updateLead(lead.id, { payoutStatus: "PAID" })}>Mark paid</button> : null}{lead.payoutStatus === "HELD" ? <button className="rounded-lg border px-3 py-2 text-xs font-semibold" disabled={busy} onClick={() => void updateLead(lead.id, { payoutStatus: "APPROVED" })}>Release hold</button> : null}</div> : <button className="mt-3 rounded-lg border px-3 py-1.5 text-xs font-semibold" disabled={busy || lead.status === "CONTACTED"} onClick={() => void updateLead(lead.id, { status: "CONTACTED" })}>Mark contacted</button>}</article>)}{!leads.length ? <p className="text-sm text-slate-500">{t("agents.noLeads")}</p> : null}</div></section>
    {message ? <p role="status" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">{message}</p> : null}
  </div>;
}

function Field({ label, value, onChange, required = false, type = "text" }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string }) { return <label className="block text-sm font-medium">{label}<input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3"/></label>; }
function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 break-words text-lg font-bold text-slate-900">{value}</p></div>; }
function AgentControl({ agent, busy, onSave }: { agent: Agent; busy: boolean; onSave: (patch: Record<string, unknown>) => void }) { const [rate, setRate] = useState(String(agent.commissionRateBps)); return <article className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{agent.user?.name || agent.user?.email || agent.referralCode}</h3><p className="text-xs text-slate-500">{agent.referralCode} · {agent._count?.leads ?? 0} leads</p></div><span className={`rounded-full px-2 py-1 text-xs font-bold ${agent.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{agent.active ? "Active" : "Inactive"}</span></div><div className="mt-3 flex items-end gap-2"><label className="text-xs font-semibold">Commission rate (bps)<input type="number" min="0" max="10000" value={rate} onChange={(event) => setRate(event.target.value)} className="mt-1 block w-36 rounded-lg border border-slate-300 p-2"/></label><button disabled={busy} onClick={() => onSave({ commissionRateBps: Number(rate) })} className="rounded-lg border px-3 py-2 text-xs font-semibold">Save rate</button><button disabled={busy} onClick={() => onSave({ active: !agent.active })} className="rounded-lg border px-3 py-2 text-xs font-semibold">{agent.active ? "Pause" : "Reactivate"}</button></div></article>; }
