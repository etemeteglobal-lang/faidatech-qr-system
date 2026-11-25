"use client";

import type { ProfileAnnouncement } from "@/lib/qr/announcements";

const MIN_SLOTS = 3;
const MAX_SLOTS = 5;
const emptyAnnouncement = (): ProfileAnnouncement => ({ text: "", badge: "", link: "" });

export default function AnnouncementItemsEditor({ announcements, onChange }: { announcements: ProfileAnnouncement[]; onChange: (next: ProfileAnnouncement[]) => void }) {
  const slots = announcements.slice(0, MAX_SLOTS);
  while (slots.length < MIN_SLOTS) slots.push(emptyAnnouncement());

  function update(index: number, patch: Partial<ProfileAnnouncement>) {
    onChange(slots.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  function clear(index: number) {
    update(index, { text: "", badge: "", link: "" });
  }

  return <section aria-labelledby="announcement-editor-title" className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 id="announcement-editor-title" className="font-semibold text-faida-navy">Scrolling announcements</h3>
        <p className="mt-1 text-xs leading-5 text-faida-slate">Add up to five updates for the slow ticker at the top of the public profile. Empty items are skipped when saved.</p>
      </div>
      {slots.length < MAX_SLOTS ? <button type="button" onClick={() => onChange([...slots, emptyAnnouncement()])} className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-faida-navy">+ Add announcement</button> : <span className="text-xs font-medium text-slate-500">Maximum 5 announcements</span>}
    </div>
    <div className="space-y-3">
      {slots.map((item, index) => <article key={index} className="rounded-xl border border-emerald-100 bg-white p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h4 className="text-sm font-bold text-slate-800">Announcement #{index + 1}</h4>
          <div className="flex gap-2">
            <button type="button" onClick={() => clear(index)} className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100">Clear</button>
            {slots.length > MIN_SLOTS ? <button type="button" aria-label={`Remove announcement #${index + 1}`} onClick={() => onChange(slots.filter((_, itemIndex) => itemIndex !== index))} className="rounded-md px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50">Remove</button> : null}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(8rem,.6fr)_minmax(0,1fr)]">
          <label className="block text-sm font-semibold text-slate-700"><span>Announcement text</span><input type="text" value={item.text} onChange={(event) => update(index, { text: event.target.value })} maxLength={500} placeholder="Share a timely update, offer, or news item" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-normal text-faida-navy outline-none focus:border-faida-teal focus:ring-4 focus:ring-teal-50" /></label>
          <label className="block text-sm font-semibold text-slate-700"><span>Badge (optional)</span><input type="text" value={item.badge ?? ""} onChange={(event) => update(index, { badge: event.target.value })} maxLength={40} placeholder="e.g. NEW" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-normal text-faida-navy outline-none focus:border-faida-teal focus:ring-4 focus:ring-teal-50" /></label>
          <label className="block text-sm font-semibold text-slate-700"><span>Link URL (optional)</span><input type="url" value={item.link ?? ""} onChange={(event) => update(index, { link: event.target.value })} placeholder="https://example.com/news" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-normal text-faida-navy outline-none focus:border-faida-teal focus:ring-4 focus:ring-teal-50" /></label>
        </div>
      </article>)}
    </div>
  </section>;
}
