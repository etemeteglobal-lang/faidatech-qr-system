"use client";

import { useState } from "react";
import type { z } from "zod";
import { sectorProfilePayloadSchema } from "@/lib/qr/payload-schemas";
import { getReadableTextColor } from "@/lib/qr/brand-presentation";
import { useI18n } from "@/i18n/LocaleProvider";

type ProfilePayload = z.infer<typeof sectorProfilePayloadSchema>;

export default function SectorProfileExperience({ payload, shortCode }: { payload: ProfilePayload; shortCode: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const accent = payload.branding?.accentColor ?? "#10B981";
  const accentText = getReadableTextColor(accent);
  const name = `${payload.firstName} ${payload.lastName}`.trim();
  const profileUrl = typeof window === "undefined" ? `/r/${shortCode}` : window.location.href;
  async function shareProfile() {
    try {
      if (navigator.share) await navigator.share({ title: name, text: payload.tagline || payload.role, url: profileUrl });
      else { await navigator.clipboard.writeText(profileUrl); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    } catch { /* dismissed share sheet */ }
  }
  return <article className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-soft">
    <header className="relative overflow-hidden bg-faida-navy p-6 text-white sm:p-9">
      {payload.spotlight ? <div className="mb-5 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs leading-5 text-emerald-50">{payload.spotlight}</div> : null}
      <div className="flex items-start gap-4">{payload.branding?.logoUrl ? <img src={payload.branding.logoUrl} alt={`${name} logo`} className="h-16 w-16 rounded-2xl bg-white object-contain p-1" /> : <div className="grid h-16 w-16 place-items-center rounded-2xl text-xl font-black" style={{ backgroundColor: accent, color: accentText }}>{`${payload.firstName[0] ?? ""}${payload.lastName[0] ?? ""}`.toUpperCase()}</div>}<div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: accent }}>{payload.customSectorName || payload.sector.replaceAll("_", " ")}</p><h1 className="mt-2 text-2xl font-semibold sm:text-4xl">{name}</h1><p className="mt-1 text-sm text-slate-300">{payload.role}{payload.organization ? ` · ${payload.organization}` : ""}</p></div></div>
      {payload.tagline ? <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200">{payload.tagline}</p> : null}
    </header>
    <div className="space-y-7 p-5 sm:p-8">
      <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void shareProfile()} className="rounded-xl px-4 py-3 text-sm font-bold" style={{ backgroundColor: accent, color: accentText }}>{copied ? t("profile.copied") : t("profile.shareProfile")}</button><a href={`/api/r/${encodeURIComponent(shortCode)}/vcard`} download className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-faida-navy">{t("profile.saveContact")}</a></div>
      {payload.bio ? <section><h2 className="text-lg font-semibold text-faida-navy">{t("profile.aboutTitle")}</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">{payload.bio}</p></section> : null}
      {payload.sectionVisibility.contact ? <section className="grid gap-3 sm:grid-cols-2">{payload.phone ? <a href={`tel:${encodeURIComponent(payload.phone)}`} className="rounded-2xl border border-slate-200 p-4 text-sm font-semibold text-faida-navy">{t("profile.callAction")}<span className="mt-1 block text-slate-500">{payload.phone}</span></a> : null}{payload.email ? <a href={`mailto:${encodeURIComponent(payload.email)}`} className="rounded-2xl border border-slate-200 p-4 text-sm font-semibold text-faida-navy">{t("profile.emailAction")}<span className="mt-1 block break-all text-slate-500">{payload.email}</span></a> : null}{payload.mapUrl ? <a href={payload.mapUrl} target="_blank" rel="noreferrer" className="rounded-2xl border border-slate-200 p-4 text-sm font-semibold text-faida-navy">{t("profile.directionsAction")}<span className="mt-1 block text-slate-500">{payload.address || t("profile.openMap")}</span></a> : null}{payload.website ? <a href={payload.website} target="_blank" rel="noreferrer" className="rounded-2xl border border-slate-200 p-4 text-sm font-semibold text-faida-navy">{t("profile.websiteAction")}<span className="mt-1 block break-all text-slate-500">{payload.website}</span></a> : null}</section> : null}
      {payload.customFields.length ? <section><h2 className="text-lg font-semibold text-faida-navy">{t("profile.detailsTitle")}</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">{payload.customFields.map((field) => <div key={field.id} className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{field.label}</p>{/^https?:\/\//i.test(field.value) ? <a href={field.value} target="_blank" rel="noreferrer" className="mt-2 block break-all text-sm font-semibold text-emerald-800">{field.value}</a> : <p className="mt-2 whitespace-pre-wrap text-sm font-semibold text-faida-navy">{field.value}</p>}</div>)}</div></section> : null}
      {payload.sectionVisibility.projects && payload.projects.length ? <section><h2 className="text-lg font-semibold text-faida-navy">{t("profile.projectsTitle")}</h2><div className="mt-3 grid gap-4 sm:grid-cols-2">{payload.projects.map((project) => <article key={project.title} className="overflow-hidden rounded-2xl border border-slate-200">{project.imageUrl ? <img src={project.imageUrl} alt="" className="h-36 w-full object-cover" /> : null}<div className="p-4"><h3 className="font-semibold text-faida-navy">{project.title}</h3>{project.description ? <p className="mt-2 text-sm leading-6 text-slate-600">{project.description}</p> : null}{project.url ? <a href={project.url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-bold text-emerald-800">{t("profile.viewProject")}</a> : null}</div></article>)}</div></section> : null}
      {payload.sectionVisibility.credentials && payload.credentials.length ? <section><h2 className="text-lg font-semibold text-faida-navy">{t("profile.credentialsTitle")}</h2><div className="mt-3 space-y-3">{payload.credentials.map((credential) => <a key={`${credential.title}-${credential.fileUrl}`} href={credential.fileUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4"><span><span className="block font-semibold text-faida-navy">{credential.title}</span><span className="mt-1 block text-sm text-slate-500">{[credential.issuer, credential.year].filter(Boolean).join(" · ") || credential.fileName}</span></span><span className="text-sm font-bold text-emerald-800">{t("profile.openFile")}</span></a>)}</div></section> : null}
      {payload.sectionVisibility.social && payload.socialLinks.length ? <section><h2 className="text-lg font-semibold text-faida-navy">{t("profile.socialTitle")}</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">{payload.socialLinks.map((link) => <a key={`${link.platform}-${link.url}`} href={link.url} target="_blank" rel="noreferrer" className="rounded-2xl border border-slate-200 p-4 transition hover:border-emerald-300 hover:bg-emerald-50/40"><p className="text-xs font-bold uppercase tracking-wider text-emerald-800">{link.platform}</p><p className="mt-1 font-semibold text-faida-navy">{link.label}</p></a>)}</div></section> : null}
      {payload.sectionVisibility.reviews && payload.reviews.length ? <section><h2 className="text-lg font-semibold text-faida-navy">{t("profile.reviewsTitle")}</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">{payload.reviews.map((review) => <blockquote key={`${review.name}-${review.quote}`} className="rounded-2xl bg-slate-50 p-4"><p className="text-amber-600" aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</p><p className="mt-2 text-sm leading-6 text-slate-700">“{review.quote}”</p><footer className="mt-3 text-xs font-bold text-faida-navy">{review.name}{review.role ? ` · ${review.role}` : ""}</footer></blockquote>)}</div></section> : null}
    </div>
  </article>;
}
