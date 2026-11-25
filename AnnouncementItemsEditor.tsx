"use client";

import type { WizardForm } from "@/components/dashboard/wizard/model";

export default function AnnouncementItemsEditor({ form, setFormAction }: { form: WizardForm; setFormAction: (next: WizardForm) => void }) {
  const announcements = form.profile.announcements;
  const update = (next: WizardForm["profile"]["announcements"]) => setFormAction({ ...form, profile: { ...form.profile, announcements: next } });

  return <section className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="font-semibold text-faida-navy">Scrolling announcements</h3><p className="mt-1 text-xs leading-5 text-faida-slate">Add messages for a slow, continuous ticker at the top of the public profile. Badge and link are optional.</p></div>
      <button type="button" onClick={() => update([...announcements, { text: "", badge: "", link: "" }])} className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-faida-navy">+ Add announcement</button>
    </div>
    {announcements.length ? <div className="space-y-3">{announcements.map((item, index) => <article key={index} className="grid gap-3 rounded-xl border border-emerald-100 bg-white p-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(8rem,.6fr)_minmax(0,1fr)_auto] sm:items-end">
      <label className="block text-sm font-semibold text-slate-700"><span>Announcement text</span><textarea value={item.text} onChange={(event) => update(announcements.map((row, rowIndex) => rowIndex === index ? { ...row, text: event.target.value } : row))} rows={2} maxLength={500} placeholder="Share a timely update, offer, or news item" className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal leading-5 text-faida-navy outline-none focus:border-faida-teal focus:ring-4 focus:ring-teal-50" /></label>
      <label className="block text-sm font-semibold text-slate-700"><span>Badge (optional)</span><input value={item.badge ?? ""} onChange={(event) => update(announcements.map((row, rowIndex) => rowIndex === index ? { ...row, badge: event.target.value } : row))} maxLength={40} placeholder="e.g. NEW" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-normal text-faida-navy outline-none focus:border-faida-teal focus:ring-4 focus:ring-teal-50" /></label>
      <label className="block text-sm font-semibold text-slate-700"><span>Link URL (optional)</span><input type="url" value={item.link ?? ""} onChange={(event) => update(announcements.map((row, rowIndex) => rowIndex === index ? { ...row, link: event.target.value } : row))} placeholder="https://example.com/news" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-normal text-faida-navy outline-none focus:border-faida-teal focus:ring-4 focus:ring-teal-50" /></label>
      <button type="button" aria-label={`Remove announcement ${index + 1}`} onClick={() => update(announcements.filter((_, rowIndex) => rowIndex !== index))} className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50 sm:self-end">Remove</button>
    </article>)}</div> : <p className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-4 text-sm text-slate-600">No scrolling announcements added yet.</p>}
  </section>;
}
