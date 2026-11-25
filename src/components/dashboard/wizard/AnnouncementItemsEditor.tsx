"use client";

import type { WizardForm } from "@/components/dashboard/wizard/model";

const INITIAL_SLOTS = 3;
const MAX_SLOTS = 5;

export default function AnnouncementItemsEditor({ form, setFormAction }: { form: WizardForm; setFormAction: (next: WizardForm) => void }) {
  const rawItems = form.profile.announcements;
  const items = rawItems.length >= INITIAL_SLOTS
    ? rawItems.slice(0, MAX_SLOTS)
    : [...rawItems, ...Array.from({ length: INITIAL_SLOTS - rawItems.length }, () => ({ text: "", badge: "", link: "" }))];

  const update = (next: WizardForm["profile"]["announcements"]) => {
    const trimmed = next.slice(0, MAX_SLOTS);
    setFormAction({ ...form, profile: { ...form.profile, announcements: trimmed } });
  };

  return <section className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="font-semibold text-faida-navy">Scrolling announcements (3–5 slots)</h3>
        <p className="mt-1 text-xs leading-5 text-faida-slate">Add up to 5 messages for a slow, continuous horizontal ticker. Badge and link are optional; empty rows are ignored on save.</p>
      </div>
      {items.length < MAX_SLOTS ? (
        <button type="button" onClick={() => update([...items, { text: "", badge: "", link: "" }])} className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-faida-navy">+ Add slot ({items.length}/{MAX_SLOTS})</button>
      ) : null}
    </div>
    <div className="space-y-3">
      {items.map((item, index) => (
        <article key={index} className="grid gap-3 rounded-xl border border-emerald-100 bg-white p-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(8rem,.6fr)_minmax(0,1fr)_auto] sm:items-end">
          <label className="block text-sm font-semibold text-slate-700">
            <span>Announcement #{index + 1}</span>
            <textarea value={item.text} onChange={(event) => update(items.map((row, rowIndex) => rowIndex === index ? { ...row, text: event.target.value } : row))} rows={2} maxLength={500} placeholder="Share a timely update, offer, or news item" className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal leading-5 text-faida-navy outline-none focus:border-faida-teal focus:ring-4 focus:ring-teal-50" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            <span>Badge (optional)</span>
            <input value={item.badge ?? ""} onChange={(event) => update(items.map((row, rowIndex) => rowIndex === index ? { ...row, badge: event.target.value } : row))} maxLength={40} placeholder="e.g. NEW" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-normal text-faida-navy outline-none focus:border-faida-teal focus:ring-4 focus:ring-teal-50" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            <span>Link URL (optional)</span>
            <input type="url" value={item.link ?? ""} onChange={(event) => update(items.map((row, rowIndex) => rowIndex === index ? { ...row, link: event.target.value } : row))} placeholder="https://example.com/news" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-normal text-faida-navy outline-none focus:border-faida-teal focus:ring-4 focus:ring-teal-50" />
          </label>
          <button type="button" aria-label={`Clear announcement ${index + 1}`} onClick={() => update(items.map((row, rowIndex) => rowIndex === index ? { text: "", badge: "", link: "" } : row))} className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50 sm:self-end">Clear</button>
        </article>
      ))}
    </div>
  </section>;
}