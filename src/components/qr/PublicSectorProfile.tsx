"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/i18n/LocaleProvider";
import { useState } from "react";
import type { MessageKey } from "@/i18n/messages";
import { verticalTemplates } from "@/lib/templates/registry";
import ProfileShareActions from "@/components/qr/ProfileShareActions";
import AnnouncementTicker from "@/components/qr/AnnouncementTicker";
import ShowcaseTicker, { type ShowcaseCardItem, ShowcaseDetailView } from "@/components/qr/ShowcaseTicker";
import { normalizeAnnouncements } from "@/lib/qr/announcements";
import { getSectorShowcaseLabels, normalizeShowcaseMode } from "@/lib/profile/sectors";

type JsonObject = Record<string, unknown>;
type Props = {
  slug: string;
  displayName: string;
  sector: string;
  profileKind: string;
  profileData: JsonObject;
  customFields: JsonObject;
  showcaseItemId?: string;
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

function normalizeLegacyShowcaseChild(value: unknown, parentTitle: string, index: number, label: string, idPrefix: string, detailBase: string): ShowcaseCardItem {
  const data = object(value);
  const childLabel = `${label} ${index + 1}`;
  const title = text(data.title ?? data.name ?? value) ?? childLabel;
  const id = `${idPrefix}-${index}`;
  const price = text(data.price);
  const nested = Array.isArray(data.children) ? data.children.map((item, nestedIndex) => normalizeLegacyShowcaseChild(item, title, nestedIndex, label, `${id}-child`, detailBase)) : [];
  return {
    id,
    title,
    kicker: `${parentTitle} · ${childLabel}`,
    imageUrl: safeHttpUrl(data.imageUrl ?? data.image) ?? undefined,
    imageAlt: `${parentTitle} — ${childLabel}`,
    badge: text(data.badge ?? data.availability) ?? undefined,
    meta: price ? `${text(data.currency) ?? "ETB"} ${price}` : undefined,
    description: text(data.description ?? data.text) ?? undefined,
    link: safeHttpUrl(data.link ?? data.url) ?? undefined,
    detailHref: `${detailBase}/${encodeURIComponent(id)}`,
    children: [...nested, ...(Array.isArray(data.attachments) ? data.attachments.map((value, fileIndex) => {
      const file = object(value);
      const url = safeHttpUrl(file.url);
      return url ? { id: `${id}-file-${fileIndex}`, title: text(file.fileName) ?? `Attachment ${fileIndex + 1}`, link: url, linkLabel: "Open attachment" } : null;
    }).filter((file): file is NonNullable<typeof file> => file !== null) : [])],
    childrenLabel: Array.isArray(data.attachments) && data.attachments.length ? "Attachments and details" : label,
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

export default function PublicSectorProfile({ slug, displayName, sector, profileKind, profileData, customFields, showcaseItemId }: Props) {
  const { t } = useI18n();
  const [credentialPreview, setCredentialPreview] = useState<{ title: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const data = object(profileData);
  const custom = object(customFields);
  const visitorName = displayName;
  const background = typeof data._pageBackground === "string" && /^#[0-9a-fA-F]{6}$/.test(data._pageBackground) ? data._pageBackground : "#f1f5f9";
  const brandLogo = safeHttpUrl(data._brandLogo);
  const spotlight = data._showSpotlight === true || data._showSpotlight === "true" || data._spotlight === true || data._spotlight === "true" || custom._spotlight === "true";
  const review = storedObject(data._review);
  const action = storedObject(data._action);
  const actionUrl = safeHttpUrl(action.url ?? action.href);
  const phone = fieldValue(custom.Phone ?? data.phone);
  const email = fieldValue(custom.Email ?? data.email);
  const whatsapp = fieldValue(custom.WhatsApp);
  const website = fieldValue(custom.Website ?? custom.website ?? data.website ?? action.url);
  const address = fieldValue(custom.Address ?? data.address);
  const hours = fieldValue(custom.Hours ?? custom.hours ?? data.hours ?? custom["Opening hours"]);
  const mapValue = fieldValue(custom.Map ?? data.map);
  const location = mapValue ?? address;
  const entityType = text(data.entityType ?? custom.entityType)?.toUpperCase();
  const mandate = text(data.mandate ?? custom.Mandate ?? custom.mandate);
  const jurisdiction = text(data.jurisdiction ?? custom.Jurisdiction ?? custom.jurisdiction);
  const leadership = text(data.leadership ?? custom.Leadership ?? custom.leadership);
  const members = text(data.members ?? custom.Members ?? custom.members);
  const aboutImage = safeHttpUrl(data._aboutImage ?? custom._aboutImage);
  const aboutText = text(data._about ?? data.about ?? data.description ?? custom.About ?? custom.about);
  const spotlightType = (text(data._spotlightType ?? custom._spotlightType ?? data.spotlightType ?? custom.spotlightType) ?? "text").toLowerCase();
  const announcements = normalizeAnnouncements(
    data.announcements ?? custom.announcements ?? data._announcements ?? custom._announcements,
    {
      text: data._spotlightText ?? custom._spotlightText ?? data.spotlight ?? custom.spotlight ?? (typeof data._spotlight === "string" ? data._spotlight : undefined),
      badge: data._spotlightTitle ?? custom._spotlightTitle,
      link: data._announcementLink ?? custom._announcementLink,
      spotlightType: data._spotlightType ?? custom._spotlightType,
      spotlightMediaUrl: data._spotlightMediaUrl ?? custom._spotlightMediaUrl ?? data.spotlightMediaUrl ?? custom.spotlightMediaUrl ?? data._spotlightImage ?? custom._spotlightImage ?? data._spotlightVideo ?? custom._spotlightVideo,
    },
  );
  const spotlightImage = safeHttpUrl(data._spotlightImage ?? custom._spotlightImage ?? data._spotlightMediaUrl ?? custom._spotlightMediaUrl ?? data.spotlightMediaUrl ?? custom.spotlightMediaUrl);
  const spotlightVideoRaw = text(data._spotlightVideo ?? custom._spotlightVideo ?? data._spotlightMediaUrl ?? custom._spotlightMediaUrl ?? data.spotlightMediaUrl ?? custom.spotlightMediaUrl);
  const spotlightVideoUrl = safeHttpUrl(spotlightVideoRaw);
  const spotlightVideo = spotlightVideoUrl && new URL(spotlightVideoUrl).protocol === "https:" && /\.(mp4|webm|ogg)(?:$|[?#])/i.test(spotlightVideoUrl) ? spotlightVideoUrl : null;
  const projectSource = data.projects ?? custom.projects ?? data._projects ?? custom._projects;
  const projects = (Array.isArray(projectSource) ? projectSource : []).map((value) => object(value)).filter((project) => Object.keys(project).length > 0);
  const showcaseMode = normalizeShowcaseMode(data.showcaseMode ?? custom.showcaseMode);
  const showcaseLabels = getSectorShowcaseLabels(sector, showcaseMode, text(data.customSectorName ?? custom.customSectorName) ?? "");
  const products = (Array.isArray(data.products ?? custom.products) ? (data.products ?? custom.products) as unknown[] : []).map(object);
  const services = (Array.isArray(data.services ?? custom.services) ? (data.services ?? custom.services) as unknown[] : []).map(object);
  const projectShowcaseItems = projects.map((project, index): ShowcaseCardItem => {
    const title = text(project.title ?? project.name) ?? `${humanize("project")} ${index + 1}`;
    const stepsValue = project.steps;
    const steps = Array.isArray(stepsValue)
      ? stepsValue.map((step) => ({ raw: step, data: object(step) })).filter(({ raw, data }) => Boolean(text(raw) ?? text(data.text ?? data.title ?? data.description ?? data.imageUrl ?? data.image)))
      : [];
    const children = steps.map(({ raw, data }, stepIndex) => {
      const stepTitle = text(data.title) ?? text(raw) ?? `${humanize("step")} ${stepIndex + 1}`;
      const stepLabel = `${showcaseLabels.childSingular} ${stepIndex + 1}`;
      return {
        id: `project-${index}-step-${stepIndex}`,
        title: stepTitle,
        kicker: `${title} · ${stepLabel}`,
        imageUrl: safeHttpUrl(data.imageUrl ?? data.image) ?? undefined,
        imageAlt: `${title} — ${stepLabel}`,
        description: text(data.description ?? data.text) ?? undefined,
        link: safeHttpUrl(data.link ?? data.url) ?? undefined,
        detailHref: `/p/${encodeURIComponent(slug)}/showcase/${encodeURIComponent(`project-${index}-step-${stepIndex}`)}`,
        children: Array.isArray(data.children) ? data.children.map((child, childIndex) => normalizeLegacyShowcaseChild(child, stepTitle, childIndex, showcaseLabels.childSingular, `project-${index}-step-${stepIndex}-child`, `/p/${encodeURIComponent(slug)}/showcase`)) : [],
        childrenLabel: showcaseLabels.childPlural,
      } satisfies ShowcaseCardItem;
    });
    return {
        id: `project-${index}`,
        title,
        kicker: showcaseLabels.parentSingular,
        imageUrl: safeHttpUrl(project.image ?? project.imageUrl ?? project.photo) ?? undefined,
        imageAlt: title,
        description: text(project.description ?? project.text) ?? undefined,
        link: safeHttpUrl(project.url) ?? undefined,
        linkLabel: t("profile.viewProject"),
        children,
        childrenLabel: showcaseLabels.childPlural,
      };
  });
  const catalogShowcaseItems: ShowcaseCardItem[] = (showcaseMode === "PRODUCT_CATALOG" ? products : showcaseMode === "SERVICE_MENU" ? services : []).map((item, index) => {
    const title = text(item.name ?? item.title) ?? `Item ${index + 1}`;
    const price = typeof item.price === "number" || typeof item.price === "string" ? String(item.price) : "";
    const meta = showcaseMode === "PRODUCT_CATALOG"
      ? price ? `${text(item.currency) ?? "ETB"} ${price}` : undefined
      : [price ? `${text(item.currency) ?? "ETB"} ${price}` : "", text(item.duration) ?? ""].filter(Boolean).join(" · ") || undefined;
    return {
      id: `catalog-${index}`,
      title,
      kicker: showcaseLabels.parentSingular,
      imageAlt: title,
      imageUrl: safeHttpUrl(item.imageUrl ?? item.image) ?? undefined,
      badge: showcaseMode === "PRODUCT_CATALOG" ? text(item.availability) ?? undefined : undefined,
      meta,
      description: text(item.description) ?? undefined,
      children: showcaseMode === "SERVICE_MENU" && Array.isArray(item.children)
        ? item.children.map((child, childIndex) => normalizeLegacyShowcaseChild(child, title, childIndex, showcaseLabels.childSingular, `service-${index}-child`, `/p/${encodeURIComponent(slug)}/showcase`))
        : [],
      childrenLabel: showcaseLabels.childPlural,
    };
  });
  const productVariantItems: ShowcaseCardItem[] = showcaseMode === "PRODUCT_CATALOG"
    ? products.map((item, index) => {
      const parentTitle = text(item.name ?? item.title) ?? `Item ${index + 1}`;
      const variants = Array.isArray(item.variants) ? item.variants.map(object).filter((variant) => Boolean(text(variant.title ?? variant.name ?? variant.description ?? variant.imageUrl ?? variant.image))) : [];
      const children = variants.map((variant, variantIndex) => normalizeLegacyShowcaseChild(variant, parentTitle, variantIndex, showcaseLabels.childSingular, `catalog-${index}-variant`, `/p/${encodeURIComponent(slug)}/showcase`));
      return {
        ...catalogShowcaseItems[index],
        children,
        childrenLabel: showcaseLabels.childPlural,
      };
    })
    : [];
  const showcaseItems = showcaseMode === "PRODUCT_CATALOG" ? productVariantItems : showcaseMode === "SERVICE_MENU" ? catalogShowcaseItems : projectShowcaseItems;
  const showcaseTitle = showcaseLabels.sectionTitle;
  if (showcaseItemId) {
    const detailItem = findShowcaseItem(showcaseItems, showcaseItemId);
    if (!detailItem) return null;
    const parentId = parentIdForShowcaseItem(detailItem);
    return <ShowcaseDetailView
      item={detailItem}
      backHref={`/p/${encodeURIComponent(slug)}?showcaseParent=${encodeURIComponent(parentId)}#showcase`}
    />;
  }
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
  const highlights = String(data._highlights ?? data.highlights ?? custom._highlights ?? "").split(/[\n,]/).map((item) => item.trim()).filter(Boolean).slice(0, 12);
  const displayData = Object.entries(data).filter(([key, value]) => key !== "announcements" && !key.startsWith("_") && value !== null && value !== undefined && value !== "");
  const customEntries = Object.entries(custom).filter(([key, value]) => key !== "customSectorName" && key !== "announcements" && !key.startsWith("_") && value !== null && value !== undefined && value !== "");
  const socialEntries = [...displayData, ...customEntries].filter(([, value]) => fieldKind(object(value)) === "social");
  const documents = [...displayData, ...customEntries].filter(([, value]) => fieldKind(object(value)) === "file");
  const otherDisplayData = displayData.filter(([, value]) => !["social", "file"].includes(fieldKind(object(value))));
  const customData = customEntries.filter(([, value]) => !["social", "file"].includes(fieldKind(object(value))));
  const sectorName = sector === "OTHER"
    ? text(custom.customSectorName) ?? t("templates.customSector")
    : t(`template.sector.${sector}` as MessageKey);
  const profileTypeKey = entityType === "GOVERNANCE" ? "profile.entityGovernance" : entityType === "GROUP" ? "profile.entityGroup" : entityType === "INDIVIDUAL" ? "profile.entityIndividual" : ({ INDIVIDUAL: "templates.individual", ORGANIZATION: "templates.organization", GOVERNMENT: "templates.government", GROUP: "templates.group" } as Record<string, MessageKey>)[profileKind] ?? "templates.organization";
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
    <article className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <AnnouncementTicker announcements={announcements} />
      {spotlight && !announcements.length ? <section id="spotlight" data-visitor-section data-visitor-label={t("profile.featured")} className="bg-gradient-to-br from-teal-800 to-cyan-900 px-6 py-5 text-center text-sm font-semibold text-white" aria-label={t("profile.featured")}><h2 className="text-base font-bold">{text(data._spotlightTitle) ?? t("profile.featured")}</h2>{text(data._spotlightText) && (spotlightType === "text" || !["image", "video", "banner"].includes(spotlightType)) ? <p className="mx-auto mt-1 max-w-xl whitespace-pre-wrap text-sm font-normal leading-6 text-teal-50">{text(data._spotlightText)}</p> : null}{spotlightType === "image" && spotlightImage ? <img src={spotlightImage} alt={text(data._spotlightTitle) ?? t("profile.featured")} className="mx-auto mt-4 max-h-80 w-full max-w-2xl rounded-2xl object-cover" /> : null}{spotlightType === "video" && spotlightVideo ? <video className="mx-auto mt-4 max-h-80 w-full max-w-2xl rounded-2xl" controls playsInline preload="metadata"><source src={spotlightVideo} /></video> : null}{spotlightType === "banner" && spotlightImage ? <img src={spotlightImage} alt="" className="mx-auto mt-4 max-h-56 w-full max-w-3xl rounded-2xl object-cover" /> : null}</section> : null}
      <header className="border-b border-slate-100 px-6 py-7 sm:px-10 sm:py-9">
        {brandLogo ? <img src={brandLogo} alt={`${visitorName} logo`} className="mb-5 h-16 max-w-40 object-contain" /> : null}
        <p className="text-xs font-bold uppercase tracking-[.18em] text-teal-800">{sectorName}</p>
        <h1 className="mt-3 break-words text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{visitorName}</h1>
        <p className="mt-2 text-sm font-medium text-slate-600">{t(profileTypeKey)}</p>
      </header>
      <div className="space-y-7 px-6 py-6 pb-20 sm:px-10 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{t("profile.publicLabel")}</p><ProfileShareActions /></div>

        {highlights.length ? <section aria-label="Key highlights" className="flex flex-wrap gap-2">{highlights.map((item) => <span key={item} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">{item}</span>)}</section> : null}
      {hours ? <section aria-label="Opening hours" className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-amber-900">Open / Hours</p><p className="mt-1 whitespace-pre-wrap text-sm font-medium text-slate-800">{hours}</p></section> : null}
        {aboutText || aboutImage || mandate || jurisdiction || leadership || members ? <section id="about" data-visitor-section data-visitor-label={t("profile.aboutTitle")} aria-label={humanize("about")} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">{aboutImage ? <img src={aboutImage} alt={displayName} className="max-h-80 w-full object-cover" /> : null}{aboutText || mandate || jurisdiction || leadership || members ? <div className="p-5"><h2 className="mb-2 text-lg font-bold text-slate-900">{humanize("about")}</h2>{aboutText ? <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{aboutText}</p> : null}{mandate ? <p className="mt-3 text-sm text-slate-700"><strong>{t("profile.mandate")}: </strong>{mandate}</p> : null}{jurisdiction ? <p className="mt-2 text-sm text-slate-700"><strong>{t("profile.jurisdiction")}: </strong>{jurisdiction}</p> : null}{leadership ? <p className="mt-2 text-sm text-slate-700"><strong>{t("profile.leadership")}: </strong>{leadership}</p> : null}{members ? <p className="mt-2 text-sm text-slate-700"><strong>{t("profile.members")}: </strong>{members}</p> : null}</div> : null}</section> : null}
        {showcaseItems.length ? <section id="showcase" data-visitor-section data-visitor-label={showcaseTitle} aria-label={showcaseTitle}><h2 className="mb-3 text-lg font-bold text-slate-900">{showcaseTitle}</h2><ShowcaseTicker items={showcaseItems} ariaLabel={showcaseTitle} className="-mx-6 mt-3 sm:-mx-10" /></section> : null}
        {showSocial && socialEntries.length > 0 ? <section id="socials" data-visitor-section data-visitor-label={t("profile.socialTitle")} aria-label={t("profile.findUsOnline")}><h2 className="mb-3 text-lg font-bold text-slate-900">{t("profile.findUsOnline")}</h2><div className="grid gap-3 sm:grid-cols-2">{socialEntries.map(([key, value]) => {
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
        {showDocuments && documents.length > 0 ? <section id="credentials" data-visitor-section data-visitor-label={t("profile.credentialsTitle")} aria-label={t("profile.files")}><h2 className="mb-3 text-lg font-bold text-slate-900">{t("profile.files")}</h2><div className="grid gap-3 sm:grid-cols-2">{documents.map(([key, value]) => {
          const record = object(value);
          const href = safeHttpUrl(record.url ?? record.href ?? record.value);
          if (!href) return null;
          const title = text(record.fileName ?? record.name ?? record.label) ?? humanize(key);
          const pdf = title.toLowerCase().endsWith(".pdf") || href.toLowerCase().includes(".pdf");
          return <article key={key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="mb-3 break-words text-sm font-semibold text-slate-900">{title}</p>{pdf ? <iframe src={href} title={title} className="h-80 w-full rounded-xl border border-slate-200" loading="lazy" /> : <button type="button" onClick={() => setCredentialPreview({ title, url: href })} className="block w-full cursor-zoom-in"><img src={href} alt={title} className="max-h-80 w-full rounded-xl object-contain" /></button>}<a href={href} download className="mt-3 inline-block text-sm font-semibold text-teal-800 underline">Download · {title}</a></article>;
        })}</div></section> : null}
        {reviewsEnabled && (ratingStars || reviewPrompt || testimonial) ? <section id="reviews" data-visitor-section data-visitor-label={t("profile.reviews")} className="rounded-2xl bg-amber-50 p-5" aria-label={t("profile.reviews")}><h2 className="text-lg font-bold text-amber-950">{t("profile.reviews")}</h2>{ratingStars ? <div className="mt-2 text-xl tracking-widest text-amber-600" aria-label={`${Math.round(ratingValue)} / 5`}>{ratingStars}</div> : null}{reviewPrompt ? <p className="mt-2 text-sm text-amber-950">{reviewPrompt}</p> : null}{testimonial ? <blockquote className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-amber-950">“{testimonial}”</blockquote> : null}{text(review.author) ? <p className="mt-3 text-xs font-semibold text-amber-900">{text(review.author)}</p> : null}</section> : null}
        {showQuickActions && (phone || email || whatsapp || website || address || location) ? <nav id="contact" data-visitor-section data-visitor-label={t("profile.contactTitle")} className="grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2" aria-label={t("templates.sectionQuickActions")}>
          {phone ? <a href={`tel:${encodeURIComponent(phone)}`} className="block rounded-2xl bg-teal-50 p-4 text-teal-950"><span className="block text-xs font-bold uppercase tracking-wider text-teal-700">{t("profile.call")}</span><span className="mt-1 block break-all text-sm font-semibold">{phone}</span></a> : null}
          {email ? <a href={`mailto:${encodeURIComponent(email)}`} className="block rounded-2xl bg-blue-50 p-4 text-blue-950"><span className="block text-xs font-bold uppercase tracking-wider text-blue-700">{t("profile.message")}</span><span className="mt-1 block break-all text-sm font-semibold">{email}</span></a> : !email && whatsapp ? <a className="rounded-2xl bg-green-50 p-4 text-green-950 transition hover:bg-green-100" href={`https://wa.me/${encodeURIComponent(whatsapp.replace(/\D/g, ""))}`} target="_blank" rel="noopener noreferrer"><span className="block text-xs font-bold uppercase tracking-wider text-green-700">WhatsApp</span><span className="mt-1 block break-all text-sm font-semibold">{whatsapp}</span></a> : null}
          {website && safeHttpUrl(website) ? <a className="rounded-2xl bg-violet-50 p-4 text-violet-950 transition hover:bg-violet-100" href={safeHttpUrl(website)!} target="_blank" rel="noopener noreferrer"><span className="block text-xs font-bold uppercase tracking-wider text-violet-700">{humanize("website")}</span><span className="mt-1 block break-all text-sm font-semibold">{website}</span></a> : null}
          {address ? <a className="rounded-2xl bg-amber-50 p-4 text-amber-950 transition hover:bg-amber-100" href={`https://maps.google.com/?q=${encodeURIComponent(mapValue ?? address)}`} target="_blank" rel="noopener noreferrer"><span className="block text-xs font-bold uppercase tracking-wider text-amber-700">{humanize("address")}</span><span className="mt-1 block break-words text-sm font-semibold">{address}</span></a> : location && !address ? <a className="rounded-2xl bg-amber-50 p-4 text-amber-950 transition hover:bg-amber-100" href={safeHttpUrl(location) ?? `https://maps.google.com/?q=${encodeURIComponent(location)}`} target="_blank" rel="noopener noreferrer"><span className="block text-xs font-bold uppercase tracking-wider text-amber-700">{t("profile.map")}</span><span className="mt-1 block break-words text-sm font-semibold">{location}</span></a> : null}
        </nav> : null}
        {actionUrl ? <div className="pt-1"><a href={actionUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-teal-800 px-6 py-3 text-center font-semibold text-white hover:bg-teal-900">{text(action.label) ?? t("profile.visitWebsite")}</a></div> : null}
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5"><a href={`/p/${encodeURIComponent(slug)}/vcard.vcf`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">{t("profile.saveContact")}</a><span className="text-xs leading-5 text-slate-500">{t("visitor.digitalBusinessCard")}</span></div>
      </div>
      {credentialPreview ? <div role="dialog" aria-modal="true" aria-label={credentialPreview.title} onClick={() => setCredentialPreview(null)} className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/90 p-4"><button type="button" onClick={() => setCredentialPreview(null)} className="absolute right-4 top-4 rounded-full bg-white px-4 py-2 font-bold text-slate-900">Close</button><img src={credentialPreview.url} alt={credentialPreview.title} onClick={(event) => event.stopPropagation()} className="max-h-[90vh] max-w-[95vw] object-contain" /></div> : null}
      <nav aria-label="Quick actions" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 gap-2 border-t border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur sm:hidden"><a href={phone ? `tel:${encodeURIComponent(phone)}` : "#contact"} className="rounded-lg bg-emerald-700 px-2 py-3 text-center text-xs font-bold text-white">Call</a><a href={safeHttpUrl(location) ?? (location ? `https://maps.google.com/?q=${encodeURIComponent(location)}` : "#contact")} className="rounded-lg bg-slate-100 px-2 py-3 text-center text-xs font-bold text-slate-800">Map</a><button type="button" onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })} className="rounded-lg bg-slate-100 px-2 py-3 text-xs font-bold text-slate-800">Contact</button></nav>
      <footer className="border-t border-slate-100 px-6 py-4 text-center text-xs text-slate-500">{t("profile.publicLabel")} · <span translate="no" className="notranslate">FaidATech</span></footer>
    </article>
  </main>;
}
