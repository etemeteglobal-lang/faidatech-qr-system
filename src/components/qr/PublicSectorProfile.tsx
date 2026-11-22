"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/i18n/LocaleProvider";
import type { MessageKey } from "@/i18n/messages";
import { verticalTemplates } from "@/lib/templates/registry";
import ProfileShareActions from "@/components/qr/ProfileShareActions";

type JsonObject = Record<string, unknown>;
type Props = {
  slug: string;
  displayName: string;
  sector: string;
  profileKind: string;
  profileData: JsonObject;
  customFields: JsonObject;
};

type SocialBrand = { name: string; mark: string; color: string };
const SOCIAL_HOSTS: Record<string, string[]> = {
  instagram: ["instagram.com", "www.instagram.com"],
  facebook: ["facebook.com", "www.facebook.com", "fb.com", "www.fb.com"],
  linkedin: ["linkedin.com", "www.linkedin.com"],
  x: ["x.com", "www.x.com", "twitter.com", "www.twitter.com"],
  twitter: ["x.com", "www.x.com", "twitter.com", "www.twitter.com"],
  youtube: ["youtube.com", "www.youtube.com", "youtu.be", "www.youtu.be"],
  tiktok: ["tiktok.com", "www.tiktok.com"],
  telegram: ["t.me", "www.t.me", "telegram.me", "www.telegram.me"],
  whatsapp: ["wa.me", "www.wa.me", "whatsapp.com", "www.whatsapp.com"],
};
const SOCIAL_BRANDS: Record<string, SocialBrand> = {
  telegram: { name: "Telegram", mark: "✈", color: "bg-sky-500" },
  tiktok: { name: "TikTok", mark: "♪", color: "bg-slate-950" },
  instagram: { name: "Instagram", mark: "◎", color: "bg-fuchsia-600" },
  linkedin: { name: "LinkedIn", mark: "in", color: "bg-blue-700" },
  whatsapp: { name: "WhatsApp", mark: "◉", color: "bg-green-600" },
  youtube: { name: "YouTube", mark: "▶", color: "bg-red-600" },
  facebook: { name: "Facebook", mark: "f", color: "bg-blue-600" },
  x: { name: "X", mark: "𝕏", color: "bg-slate-950" },
  twitter: { name: "X", mark: "𝕏", color: "bg-slate-950" },
};
const knownTemplateFields = new Set<string>(verticalTemplates.flatMap((template) => [...template.fields]));

function object(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function storedObject(value: unknown): JsonObject {
  const direct = object(value);
  if (Object.keys(direct).length || typeof value !== "string") return direct;
  try {
    const parsed: unknown = JSON.parse(value);
    return object(parsed);
  } catch {
    return {};
  }
}

function text(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function fieldKind(item: JsonObject): string {
  return String(item.type ?? item.kind ?? item.fieldType ?? "").toLowerCase();
}

function fieldValue(value: unknown): string | null {
  const item = object(value);
  return text(item.value ?? item.url ?? item.href ?? value);
}

function safeHttpUrl(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function safeSocialUrl(value: unknown, platformValue: unknown): string | null {
  const href = safeHttpUrl(value);
  const platform = text(platformValue)?.toLowerCase();
  if (!href || !platform || !SOCIAL_HOSTS[platform]) return null;
  try {
    return SOCIAL_HOSTS[platform].includes(new URL(href).hostname.toLowerCase()) ? href : null;
  } catch {
    return null;
  }
}

function humanize(value: string) {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replaceAll("_", " ").replace(/^./, (first) => first.toUpperCase());
}

export default function PublicSectorProfile({ slug, displayName, sector, profileKind, profileData, customFields }: Props) {
  const { t } = useI18n();
  const data = object(profileData);
  const custom = object(customFields);
  const background = typeof data._pageBackground === "string" && /^#[0-9a-fA-F]{6}$/.test(data._pageBackground) ? data._pageBackground : "#f1f5f9";
  const brandLogo = safeHttpUrl(data._brandLogo);
  const spotlight = data._showSpotlight === true || data._showSpotlight === "true" || data._spotlight === true || data._spotlight === "true" || custom._spotlight === "true";
  const review = storedObject(data._review);
  const action = storedObject(data._action);
  const actionUrl = safeHttpUrl(action.url ?? action.href);
  const phone = fieldValue(custom.Phone ?? data.phone);
  const email = fieldValue(custom.Email ?? data.email);
  const whatsapp = fieldValue(custom.WhatsApp);
  const location = fieldValue(custom.Map ?? custom.Address ?? data.address);
  const ratingMode = text(data._ratingMode ?? custom._ratingMode) ?? "off";
  const reviewPrompt = text(data._testimonialPrompt ?? custom._testimonialPrompt);
  const testimonial = fieldValue(custom.Testimonial) ?? text(review.text ?? review.content);
  const ratingValue = Number(fieldValue(custom.Rating));
  const ratingStars = Number.isFinite(ratingValue) && ratingValue >= 0 && ratingValue <= 5 ? "★".repeat(Math.round(ratingValue)) + "☆".repeat(5 - Math.round(ratingValue)) : "";
  const showDetails = data._showDetails !== false && data._showDetails !== "false";
  const showSocial = data._showSocial !== false && data._showSocial !== "false";
  const showDocuments = data._showDocuments !== false && data._showDocuments !== "false";
  const showReviews = data._showReviews !== false && data._showReviews !== "false";
  const showQuickActions = data._showQuickActions !== false && data._showQuickActions !== "false";
  const displayData = Object.entries(data).filter(([key, value]) => !key.startsWith("_") && value !== null && value !== undefined && value !== "");
  const customEntries = Object.entries(custom).filter(([key, value]) => key !== "customSectorName" && !key.startsWith("_") && value !== null && value !== undefined && value !== "");
  const socialEntries = [...displayData, ...customEntries].filter(([, value]) => fieldKind(object(value)) === "social");
  const documents = [...displayData, ...customEntries].filter(([, value]) => fieldKind(object(value)) === "file");
  const otherDisplayData = displayData.filter(([, value]) => !["social", "file"].includes(fieldKind(object(value))));
  const customData = customEntries.filter(([, value]) => !["social", "file"].includes(fieldKind(object(value))));
  const sectorName = sector === "OTHER"
    ? text(custom.customSectorName) ?? t("templates.customSector")
    : t(`template.sector.${sector}` as MessageKey);
  const profileTypeKey = ({ INDIVIDUAL: "templates.individual", ORGANIZATION: "templates.organization", GOVERNMENT: "templates.government", GROUP: "templates.group" } as Record<string, MessageKey>)[profileKind] ?? "templates.organization";
  const displayLabel = (key: string, item: unknown) => {
    const record = object(item);
    const explicit = text(record.label ?? record.name);
    if (explicit && explicit !== key) return explicit;
    return knownTemplateFields.has(key) ? t(`template.field.${key}` as MessageKey) : humanize(key);
  };
  const renderValue = (value: unknown, key: string): ReactNode => {
    const item = object(value);
    const kind = fieldKind(item);
    const content = item.value ?? item.url ?? item.href;
    if (kind === "link" || kind === "url") {
      const href = safeHttpUrl(content);
      return href ? <a className="break-all font-semibold text-teal-800 underline underline-offset-2" href={href} target="_blank" rel="noopener noreferrer">{text(item.value ?? item.label) ?? href}</a> : null;
    }
    if (kind === "file") {
      const href = safeHttpUrl(item.url ?? item.href ?? item.value);
      return href ? <a className="font-semibold text-teal-800 underline underline-offset-2" href={href} target="_blank" rel="noopener noreferrer">{text(item.fileName ?? item.name) ?? key}</a> : null;
    }
    if (kind === "text" || kind === "textarea" || kind === "email" || kind === "phone") {
      const valueText = text(content);
      return valueText ? <span className="whitespace-pre-wrap break-words">{valueText}</span> : null;
    }
    const plain = text(value);
    return plain ? <span className="whitespace-pre-wrap break-words">{plain}</span> : null;
  };
  const reviewsEnabled = showReviews && (ratingMode === "stars" || ratingMode === "stars-review");

  return <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-10" style={{ backgroundColor: background }}>
    <article className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {spotlight ? <div className="bg-teal-800 px-6 py-3 text-center text-sm font-semibold text-white">{text(data._spotlightTitle) ?? t("profile.featured")}{text(data._spotlightText) ? <p className="mx-auto mt-1 max-w-xl text-sm font-normal leading-6 text-teal-50">{text(data._spotlightText)}</p> : null}</div> : null}
      <header className="border-b border-slate-100 px-6 py-7 sm:px-10 sm:py-9">
        {brandLogo ? <img src={brandLogo} alt={`${displayName} logo`} className="mb-5 h-16 max-w-40 object-contain" /> : null}
        <p className="text-xs font-bold uppercase tracking-[.18em] text-teal-800">{sectorName}</p>
        <h1 className="mt-3 break-words text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{displayName}</h1>
        <p className="mt-2 text-sm font-medium text-slate-600">{t(profileTypeKey)}</p>
      </header>
      <div className="space-y-7 px-6 py-6 sm:px-10 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{t("profile.publicLabel")}</p><ProfileShareActions /></div>
        {showSocial && socialEntries.length > 0 ? <section aria-label={t("profile.findUsOnline")}><h2 className="mb-3 text-lg font-bold text-slate-900">{t("profile.findUsOnline")}</h2><div className="grid gap-3 sm:grid-cols-2">{socialEntries.map(([key, value]) => {
          const item = object(value);
          const platform = text(item.platform)?.toLowerCase() ?? "";
          const brand = SOCIAL_BRANDS[platform];
          const href = safeSocialUrl(item.url ?? item.href ?? item.value, platform);
          if (!href || !brand) return null;
          let profileName = text(item.handle ?? item.username ?? item.channelName ?? item.name ?? item.label);
          if (!profileName || profileName === brand.name) {
            const tail = new URL(href).pathname.split("/").filter(Boolean).at(-1);
            profileName = tail ? (tail.startsWith("@") ? tail : `@${tail}`) : brand.name;
          }
          const subtitle = text(item.bio ?? item.subtitle ?? item.description);
          return <a key={key} className="group flex min-h-28 min-w-0 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 sm:p-5" href={href} target="_blank" rel="noopener noreferrer" aria-label={`${brand.name}: ${profileName}`}>
            <span aria-hidden="true" className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl font-black text-white ${brand.color}`}>{brand.mark}</span>
            <span className="min-w-0 flex-1"><span className="block text-xs font-bold uppercase tracking-wider text-slate-500">{brand.name}</span><span className="mt-1 block break-words text-lg font-bold text-slate-900 group-hover:text-teal-800">{profileName}</span>{subtitle ? <span className="mt-1 block line-clamp-2 text-sm leading-5 text-slate-600">{subtitle}</span> : null}</span>
            <span aria-hidden="true" className="text-xl text-slate-400">↗</span>
          </a>;
        })}</div></section> : null}
        {showDetails && (otherDisplayData.length > 0 || customData.length > 0) ? <section aria-label={t("profile.details")}><h2 className="mb-3 text-lg font-bold text-slate-900">{t("profile.details")}</h2><div className="grid gap-3 sm:grid-cols-2">{otherDisplayData.map(([key, value]) => <div key={key} className="min-w-0 rounded-2xl bg-slate-50 p-4"><h3 className="mb-2 text-sm font-semibold text-slate-700">{displayLabel(key, value)}</h3><div className="text-sm leading-6 text-slate-800">{renderValue(value, key)}</div></div>)}</div>{customData.length > 0 ? <dl className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-100 px-4">{customData.map(([key, value]) => <div key={key} className="grid gap-1 py-4 sm:grid-cols-[minmax(9rem,.4fr)_1fr] sm:gap-6"><dt className="text-sm font-semibold text-slate-600">{displayLabel(key, value)}</dt><dd className="min-w-0 text-sm leading-6 text-slate-800">{renderValue(value, key)}</dd></div>)}</dl> : null}</section> : null}
        {showDocuments && documents.length > 0 ? <section aria-label={t("profile.files")}><h2 className="mb-3 text-lg font-bold text-slate-900">{t("profile.files")}</h2><div className="grid gap-3 sm:grid-cols-2">{documents.map(([key, value]) => {
          const record = object(value);
          const href = safeHttpUrl(record.url ?? record.href ?? record.value);
          if (!href) return null;
          const title = text(record.fileName ?? record.name ?? record.label) ?? humanize(key);
          const pdf = title.toLowerCase().endsWith(".pdf") || href.toLowerCase().includes(".pdf");
          return <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-teal-700"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-xs font-black text-teal-900">{pdf ? "PDF" : "FILE"}</span><span className="min-w-0"><span className="block break-words text-sm font-semibold text-slate-900">{title}</span><span className="mt-1 block text-xs font-semibold text-teal-800 underline">{t("preview.openDocument")}</span></span></a>;
        })}</div></section> : null}
        {reviewsEnabled && (ratingStars || reviewPrompt || testimonial) ? <section className="rounded-2xl bg-amber-50 p-5" aria-label={t("profile.reviews")}><h2 className="text-lg font-bold text-amber-950">{t("profile.reviews")}</h2>{ratingStars ? <div className="mt-2 text-xl tracking-widest text-amber-600" aria-label={`${Math.round(ratingValue)} / 5`}>{ratingStars}</div> : null}{reviewPrompt ? <p className="mt-2 text-sm text-amber-950">{reviewPrompt}</p> : null}{testimonial ? <blockquote className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-amber-950">“{testimonial}”</blockquote> : null}{text(review.author) ? <p className="mt-3 text-xs font-semibold text-amber-900">{text(review.author)}</p> : null}</section> : null}
        {showQuickActions && (phone || email || whatsapp || location) ? <nav className="flex flex-wrap gap-3 border-t border-slate-100 pt-5" aria-label={t("templates.sectionQuickActions")}>
          {phone ? <a className="inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-800 px-4 py-3 text-sm font-semibold text-white" href={`tel:${encodeURIComponent(phone)}`}>{t("profile.call")}</a> : null}
          {email ? <a className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white" href={`mailto:${encodeURIComponent(email)}`}>{t("profile.message")}</a> : !email && whatsapp ? <a className="inline-flex min-h-11 items-center justify-center rounded-xl bg-green-700 px-4 py-3 text-sm font-semibold text-white" href={`https://wa.me/${encodeURIComponent(whatsapp.replace(/\D/g, ""))}`} target="_blank" rel="noopener noreferrer">{t("profile.message")}</a> : null}
          {location ? <a className="inline-flex min-h-11 items-center justify-center rounded-xl border border-teal-800 px-4 py-3 text-sm font-semibold text-teal-900" href={`https://maps.google.com/?q=${encodeURIComponent(location)}`} target="_blank" rel="noopener noreferrer">{t("profile.map")}</a> : null}
        </nav> : null}
        {actionUrl ? <div className="pt-1"><a href={actionUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-teal-800 px-6 py-3 text-center font-semibold text-white hover:bg-teal-900">{text(action.label) ?? t("profile.visitWebsite")}</a></div> : null}
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5"><a href={`/p/${encodeURIComponent(slug)}/vcard.vcf`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">{t("profile.saveContact")}</a><span className="text-xs leading-5 text-slate-500">{t("visitor.digitalBusinessCard")}</span></div>
      </div>
      <footer className="border-t border-slate-100 px-6 py-4 text-center text-xs text-slate-500">{t("profile.publicLabel")} · FaidATech</footer>
    </article>
  </main>;
}
