"use client";

import { useState } from "react";
import type { z } from "zod";
import { sectorProfilePayloadSchema } from "@/lib/qr/payload-schemas";
import { getReadableTextColor } from "@/lib/qr/brand-presentation";
import { getSectorShowcaseLabels } from "@/lib/profile/sectors";
import { useI18n } from "@/i18n/LocaleProvider";
import AnnouncementTicker from "@/components/qr/AnnouncementTicker";
import ShowcaseTicker, { type ShowcaseCardItem, ShowcaseDetailView } from "@/components/qr/ShowcaseTicker";
import { normalizeAnnouncements } from "@/lib/qr/announcements";

type ProfilePayload = z.infer<typeof sectorProfilePayloadSchema>;
type ProfileShowcaseChild = NonNullable<NonNullable<ProfilePayload["products"][number]["variants"]>[number]>;

function mapProfileShowcaseChild(child: ProfileShowcaseChild, parentTitle: string, index: number, label: string, idPrefix: string, detailBase: string): ShowcaseCardItem {
  const childLabel = `${label} ${index + 1}`;
  const id = `${idPrefix}-${index}`;
  const meta = child.price !== undefined ? `${child.currency || "ETB"} ${child.price.toLocaleString()}` : undefined;
  return {
    id,
    title: child.title || childLabel,
    kicker: `${parentTitle} · ${childLabel}`,
    imageUrl: child.imageUrl,
    imageAlt: `${parentTitle} — ${childLabel}`,
    badge: child.badge,
    meta,
    description: child.description,
    link: child.link,
    detailHref: `${detailBase}/${encodeURIComponent(id)}`,
    children: [...(child.children ?? []).map((nested, nestedIndex) => mapProfileShowcaseChild(nested, child.title || childLabel, nestedIndex, label, `${id}-child`, detailBase)), ...(child.attachments ?? []).map((file, fileIndex) => ({ id: `${id}-file-${fileIndex}`, title: file.fileName, link: file.url, attachmentFileName: file.fileName, attachmentMimeType: file.mimeType, linkLabel: `Open ${file.mimeType.startsWith("image/") ? "image" : file.mimeType === "application/pdf" ? "PDF" : "file"} attachment` }))],
    childrenLabel: child.attachments?.length ? "Attachments and options" : label,
  };
}

function findShowcaseItem(items: ShowcaseCardItem[], id: string): ShowcaseCardItem | null {
  for (const item of items) {
    if (item.id === id) return item;
    const nested = item.children ? findShowcaseItem(item.children, id) : null;
    if (nested) return nested;
  }
  return null;
}

function parentIdForShowcaseItem(item: ShowcaseCardItem): string {
  return item.parentId ?? item.id.match(/^(?:project|product|service|catalog)-\d+/)?.[0] ?? item.id;
}

export default function SectorProfileExperience({ payload, shortCode, showcaseItemId, previewMode = false }: { payload: ProfilePayload; shortCode: string; showcaseItemId?: string; previewMode?: boolean }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [credentialPreview, setCredentialPreview] = useState<{ title: string; url: string } | null>(null);
  const accent = payload.branding?.accentColor ?? "#10B981";
  const accentText = getReadableTextColor(accent);
  const announcements = normalizeAnnouncements(payload.announcements, { text: payload.spotlight, spotlightType: payload.spotlightType, spotlightMediaUrl: payload.spotlightMediaUrl });
  const defaultName = payload.entityType === "INDIVIDUAL" ? `${payload.firstName ?? ""} ${payload.lastName ?? ""}`.trim() : payload.organization || `${payload.firstName ?? ""} ${payload.lastName ?? ""}`.trim();
  const name = defaultName;
  const profileUrl = typeof window === "undefined" ? `/r/${shortCode}` : window.location.href;
  const showcaseLabels = getSectorShowcaseLabels(payload.sector, payload.showcaseMode, payload.customSectorName);

  async function shareProfile() {
    try {
      if (navigator.share) await navigator.share({ title: name, text: payload.tagline || payload.role, url: profileUrl });
      else { await navigator.clipboard.writeText(profileUrl); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    } catch { /* dismissed share sheet */ }
  }

  const projectShowcaseItems: ShowcaseCardItem[] = payload.projects.map((project, index) => {
    const children = project.steps
      .filter((step) => step.title || step.description || step.imageUrl)
      .map((step, stepIndex) => {
        const stepLabel = `${showcaseLabels.childSingular} ${stepIndex + 1}`;
        return {
          id: `project-${index}-step-${stepIndex}`,
          title: step.title || stepLabel,
          kicker: `${project.title} · ${stepLabel}`,
          imageUrl: step.imageUrl,
          imageAlt: `${project.title} — ${stepLabel}`,
          description: step.description,
          link: step.link,
          detailHref: `/r/${encodeURIComponent(shortCode)}/showcase/${encodeURIComponent(`project-${index}-step-${stepIndex}`)}`,
          children: (step.children ?? []).map((child, childIndex) => mapProfileShowcaseChild(child, step.title || stepLabel, childIndex, showcaseLabels.childSingular, `project-${index}-step-${stepIndex}-child`, `/r/${encodeURIComponent(shortCode)}/showcase`)),
          childrenLabel: showcaseLabels.childPlural,
        } satisfies ShowcaseCardItem;
      });
    return {
      id: `project-${index}`,
      title: project.title,
      kicker: showcaseLabels.parentSingular,
      imageUrl: project.imageUrl,
      imageAlt: project.title,
      description: project.description,
      link: project.url,
      linkLabel: t("profile.viewProject"),
      children,
      childrenLabel: showcaseLabels.childPlural,
    };
  });

  const catalogShowcaseItems: ShowcaseCardItem[] = payload.showcaseMode === "PRODUCT_CATALOG"
    ? payload.products.map((item, index): ShowcaseCardItem => {
      const parentTitle = item.name;
      const parent = {
        id: `product-${index}`,
        title: parentTitle,
        kicker: showcaseLabels.parentSingular,
        imageUrl: item.imageUrl,
        imageAlt: parentTitle,
        badge: item.availability === "AVAILABLE" ? "Available" : item.availability === "OUT_OF_STOCK" ? "Out of stock" : item.availability === "PREORDER" ? "Pre-order" : "By request",
        meta: item.price !== undefined ? `${item.currency || "ETB"} ${item.price.toLocaleString()}` : undefined,
        description: item.description,
      } satisfies ShowcaseCardItem;
      const variants = (item.variants ?? []).map((variant, variantIndex) => mapProfileShowcaseChild(variant, parentTitle, variantIndex, showcaseLabels.childSingular, `product-${index}-variant`, `/r/${encodeURIComponent(shortCode)}/showcase`));
      return { ...parent, children: variants, childrenLabel: showcaseLabels.childPlural };
    })
    : payload.services.map((item, index) => ({
      id: `service-${index}`,
      title: item.name,
      kicker: showcaseLabels.parentSingular,
      imageUrl: item.imageUrl,
      imageAlt: item.name,
      meta: [item.price !== undefined ? `${item.currency || "ETB"} ${item.price.toLocaleString()}` : "", item.duration || ""].filter(Boolean).join(" · ") || undefined,
      description: item.description,
      children: (item.children ?? []).map((child, childIndex) => mapProfileShowcaseChild(child, item.name, childIndex, showcaseLabels.childSingular, `service-${index}-child`, `/r/${encodeURIComponent(shortCode)}/showcase`)),
      childrenLabel: showcaseLabels.childPlural,
    }));
  const showcaseItems = payload.showcaseMode === "PROJECT_PROCESS" ? projectShowcaseItems : catalogShowcaseItems;
  const showcaseTitle = showcaseLabels.sectionTitle;

  if (showcaseItemId) {
    const detailItem = findShowcaseItem(showcaseItems, showcaseItemId);
    if (!detailItem) return null;
    const parentId = parentIdForShowcaseItem(detailItem);
    return <ShowcaseDetailView
      item={detailItem}
      backHref={`/r/${encodeURIComponent(shortCode)}?showcaseParent=${encodeURIComponent(parentId)}#showcase`}
    />;
  }

  return <article className="overflow-hidden rounded-[30px] border border-slate-200 bg-white pb-16 shadow-soft sm:pb-0">
    <AnnouncementTicker announcements={announcements} />
    <header className="relative overflow-hidden bg-faida-navy p-6 text-white sm:p-9">
      {payload.spotlight && !announcements.length ? <div id="spotlight" data-visitor-section data-visitor-label={t("profile.featured")} className="mb-5 overflow-hidden rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-xs leading-5 text-emerald-50"><p>{payload.spotlight}</p>{payload.spotlightType === "image" && payload.spotlightMediaUrl ? <img src={payload.spotlightMediaUrl} alt="" className="mt-3 max-h-72 w-full rounded-xl object-cover" /> : null}{payload.spotlightType === "video" && payload.spotlightMediaUrl ? <video className="mt-3 max-h-72 w-full rounded-xl" controls playsInline preload="metadata"><source src={payload.spotlightMediaUrl} /></video> : null}</div> : null}
      <div className="flex items-start gap-4">{payload.branding?.logoUrl ? <img src={payload.branding.logoUrl} alt={`${name} logo`} className="h-16 w-16 rounded-2xl bg-white object-contain p-1" /> : <div className="grid h-16 w-16 place-items-center rounded-2xl text-xl font-black" style={{ backgroundColor: accent, color: accentText }}>{`${(payload.firstName ?? "")[0] ?? ""}${(payload.lastName ?? "")[0] ?? ""}`.toUpperCase()}</div>}<div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: accent }}>{payload.customSectorName || payload.sector.replaceAll("_", " ")}</p><h1 className="mt-2 text-2xl font-semibold sm:text-4xl">{name}</h1><p className="mt-1 text-sm text-slate-300">{payload.entityType === "INDIVIDUAL" ? payload.role : payload.entityType === "GOVERNANCE" ? t("profile.entityGovernance") : payload.entityType === "GROUP" ? t("profile.entityGroup") : t("profile.entityOrganization")}{payload.jurisdiction ? ` · ${payload.jurisdiction}` : ""}</p></div></div>
      {Array.isArray(payload.highlights) && payload.highlights.length ? <div aria-label="Key highlights" className="mt-4 flex flex-wrap gap-2">{payload.highlights.map((item: string) => <span key={item} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">{item}</span>)}</div> : null}{payload.tagline ? <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200">{payload.tagline}</p> : null}
    </header>
    <div className="space-y-7 p-5 sm:p-8">
      {!previewMode ? <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void shareProfile()} className="rounded-xl px-4 py-3 text-sm font-bold" style={{ backgroundColor: accent, color: accentText }}>{copied ? t("profile.copied") : t("profile.shareProfile")}</button><a href={`/api/r/${encodeURIComponent(shortCode)}/vcard`} download className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-faida-navy">{t("profile.saveContact")}</a></div> : null}

      {payload.bio || payload.aboutImageUrl || payload.mandate || payload.leadership || payload.members ? <section id="about" data-visitor-section data-visitor-label={t("profile.aboutTitle")} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">{payload.aboutImageUrl ? <img src={payload.aboutImageUrl} alt={name} className="max-h-80 w-full object-cover" /> : null}<div className="p-4"><h2 className="text-lg font-semibold text-faida-navy">{t("profile.aboutTitle")}</h2>{payload.bio ? <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">{payload.bio}</p> : null}{payload.mandate ? <p className="mt-3 text-sm leading-6 text-slate-700"><strong>{t("profile.mandate")}: </strong>{payload.mandate}</p> : null}{payload.leadership ? <p className="mt-3 text-sm leading-6 text-slate-700"><strong>{t("profile.leadership")}: </strong>{payload.leadership}</p> : null}{payload.members ? <p className="mt-3 text-sm leading-6 text-slate-700"><strong>{t("profile.members")}: </strong>{payload.members}</p> : null}</div></section> : null}
      {payload.hours ? <section aria-label="Opening hours" className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-amber-900">Open / Hours</p><p className="mt-1 whitespace-pre-wrap text-sm font-medium text-slate-800">{payload.hours}</p></section> : null}
      {payload.sectionVisibility.contact && (payload.phone || payload.email || payload.website || payload.mapUrl || payload.address) ? <section id="contact" data-visitor-section data-visitor-label={t("profile.contactTitle")} className="grid gap-3 sm:grid-cols-2">{payload.phone ? <a href={`tel:${encodeURIComponent(payload.phone)}`} className="block rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-950">☎ {t("profile.callAction")}<span className="mt-1 block font-medium text-slate-600">{payload.phone}</span></a> : null}{payload.email ? <a href={`mailto:${encodeURIComponent(payload.email)}`} className="block rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm font-bold text-sky-950">✉ {t("profile.emailAction")}<span className="mt-1 block break-all font-medium text-slate-600">{payload.email}</span></a> : null}{payload.website ? <a href={payload.website} target="_blank" rel="noreferrer" className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm font-bold text-violet-950 transition hover:-translate-y-0.5 hover:shadow">↗ {t("profile.websiteAction")}<span className="mt-1 block break-all font-medium text-slate-600">{payload.website}</span></a> : null}{payload.mapUrl || payload.address ? <a href={payload.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(payload.address ?? "")}`} target="_blank" rel="noreferrer" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-950 transition hover:-translate-y-0.5 hover:shadow">⌖ {t("profile.directionsAction")}<span className="mt-1 block font-medium text-slate-600">{payload.address || t("profile.openMap")}</span></a> : null}</section> : null}
      {payload.sectionVisibility.projects && showcaseItems.length ? <section id="showcase" data-visitor-section data-visitor-label={showcaseTitle} aria-label={showcaseTitle}><h2 className="text-lg font-semibold text-faida-navy">{showcaseTitle}</h2><ShowcaseTicker items={showcaseItems} ariaLabel={showcaseTitle} className="-mx-5 mt-3 sm:-mx-8" /></section> : null}
      {payload.sectionVisibility.credentials && payload.credentials.length ? <section id="credentials" data-visitor-section data-visitor-label={t("profile.credentialsTitle")}><h2 className="text-lg font-semibold text-faida-navy">{t("profile.credentialsTitle")}</h2><div className="mt-3 grid gap-4">{payload.credentials.map((credential) => <article key={`${credential.title}-${credential.fileUrl}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold text-faida-navy">{credential.title}</h3><p className="mt-1 text-sm text-slate-500">{[credential.issuer, credential.year].filter(Boolean).join(" · ") || credential.fileName}</p></div><a href={credential.fileUrl} download={credential.fileName} className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-emerald-800">Download</a></div>{credential.mimeType.startsWith("image/") ? <button type="button" onClick={() => setCredentialPreview({ title: credential.title, url: credential.fileUrl })} className="mt-3 block w-full cursor-zoom-in"><img src={credential.fileUrl} alt={credential.title} className="max-h-80 w-full rounded-xl border border-slate-100 object-contain" /></button> : <iframe src={credential.fileUrl} title={credential.title} className="mt-3 h-96 w-full rounded-xl border border-slate-200" loading="lazy" />}</article>)}</div></section> : null}
      {payload.sectionVisibility.social && payload.socialLinks.length ? <section id="socials" data-visitor-section data-visitor-label={t("profile.socialTitle")}><h2 className="text-lg font-semibold text-faida-navy">{t("profile.socialTitle")}</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">{payload.socialLinks.map((link) => <a key={`${link.platform}-${link.url}`} href={link.url} target="_blank" rel="noreferrer" className="public-social-card flex min-h-24 items-center gap-4 rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"><span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-emerald-800 text-lg font-black text-white">{link.avatarUrl ? <img src={link.avatarUrl} alt="" className="h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : link.platform.toLowerCase().includes("instagram") ? "◎" : link.platform.toLowerCase().includes("youtube") ? "▶" : link.platform.toLowerCase().includes("linkedin") ? "in" : link.platform.toLowerCase().includes("facebook") ? "f" : link.platform.toLowerCase().includes("tiktok") ? "♪" : link.platform.slice(0, 1).toUpperCase()}</span><span className="min-w-0"><span className="block text-xs font-bold uppercase tracking-wider text-emerald-800">{link.platform}</span><span className="mt-1 block truncate font-semibold text-faida-navy">{link.label}</span></span><span aria-hidden="true" className="ml-auto text-slate-400">↗</span></a>)}</div></section> : null}
      {payload.sectionVisibility.reviews && payload.reviews.length ? <section id="reviews" data-visitor-section data-visitor-label={t("profile.reviewsTitle")}><h2 className="text-lg font-semibold text-faida-navy">{t("profile.reviewsTitle")}</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">{payload.reviews.map((review) => <blockquote key={`${review.name}-${review.quote}`} className="rounded-2xl bg-slate-50 p-4"><p className="text-amber-600" aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</p><p className="mt-2 text-sm leading-6 text-slate-700">“{review.quote}”</p><footer className="mt-3 text-xs font-bold text-faida-navy">{review.name}{review.role ? ` · ${review.role}` : ""}</footer></blockquote>)}</div></section> : null}
    </div>
    {!previewMode ? <nav aria-label="Quick actions" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 gap-2 border-t border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur sm:hidden"><a href={payload.phone ? `tel:${encodeURIComponent(payload.phone)}` : "#contact"} className="rounded-lg bg-emerald-700 px-2 py-3 text-center text-xs font-bold text-white">Call</a><a href={payload.mapUrl || (payload.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(payload.address)}` : "#contact")} className="rounded-lg bg-slate-100 px-2 py-3 text-center text-xs font-bold text-slate-800">Map</a><button type="button" onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })} className="rounded-lg bg-slate-100 px-2 py-3 text-xs font-bold text-slate-800">Contact</button></nav> : null}
    {credentialPreview ? <div role="dialog" aria-modal="true" aria-label={credentialPreview.title} onClick={() => setCredentialPreview(null)} className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/90 p-4"><button type="button" onClick={() => setCredentialPreview(null)} className="absolute right-4 top-4 rounded-full bg-white px-4 py-2 font-bold text-slate-900">Close</button><img src={credentialPreview.url} alt={credentialPreview.title} onClick={(event) => event.stopPropagation()} className="max-h-[90vh] max-w-[95vw] object-contain" /></div> : null}
  </article>;
}
