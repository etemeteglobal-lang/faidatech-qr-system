import { isScanSafeQrForeground } from "@/lib/qr/brand-presentation";
import { localeMetadata, uniqueLocaleCodes, type LocaleCode } from "@/i18n/registry";
import type { MessageKey } from "@/i18n/messages";
import type { LocalizedContent, LocalizedTextOverride } from "@/i18n/localized-content";
import { type ProfileFieldType, sectorOptions } from "@/lib/profile/sectors";
import { normalizeAnnouncements, type ProfileAnnouncement } from "@/lib/qr/announcements";

export type WizardPurpose = "SECTOR_PROFILE" | "LANDING_PAGE" | "VCARD" | "MENU" | "TOURISM_AUDIO" | "PDF" | "LOCAL_PAYMENTS";
type MediaKind = "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT";
type KeyValue = { key: string; value: string };
const DEFAULT_ACCENT = "#10B981";
const DEFAULT_QR_FOREGROUND = "#0F172A";
function defaultShowcaseMode(sector: string): WizardForm["profile"]["showcaseMode"] {
  if (["RETAIL_COMMERCE", "MANUFACTURING", "AGRICULTURE", "FOOD_BEVERAGE"].includes(sector)) return "PRODUCT_CATALOG";
  if (["CONSTRUCTION", "GOVERNMENT", "NONPROFIT", "MEDIA_CREATIVE", "ARTS_CULTURE", "SCIENCE_RESEARCH"].includes(sector)) return "PROJECT_PROCESS";
  return sector === "OTHER" ? "PROJECT_PROCESS" : "SERVICE_MENU";
}

export type WizardForm = {
  purpose: WizardPurpose | null;
  title: string;
  description: string;
  branding: { brandName: string; logoUrl: string; accentColor: string; qrForeground: string };
  landing: { summary: string; body: string; imageUrl: string; buttonLabel: string; buttonUrl: string };
  vcard: { firstName: string; lastName: string; phone: string; email: string; organization: string; jobTitle: string; website: string; address: string };
  socialLinks: { platform: string; label: string; url: string }[];
  menuItems: { name: string; category: string; categoryDescription: string; priceETB: string; description: string; imageUrl: string; isAvailable: boolean }[];
  telebirr: { merchantName: string; merchantCode: string; checkoutUrl: string; metadata: KeyValue[] };
  audioLinks: Record<LocaleCode, string>;
  transcripts: Record<LocaleCode, string>;
  localizedContent: LocalizedContent;
  tourismSummary: string;
  historicalMedia: { kind: MediaKind; url: string; title: string; caption: string; assetId: string }[];
  gps: { latitude: string; longitude: string; altitudeMeters: string };
  pdf: { fileUrl: string; fileName: string; assetId: string; fileSizeBytes: string; hostedAssetMetadata: KeyValue[] };
  paymentUrl: string;
  profile: {
    sector: (typeof sectorOptions)[number]["id"];
    entityType: "INDIVIDUAL" | "ORGANIZATION" | "GROUP" | "GOVERNANCE";
    customSectorName: string;
    firstName: string;
    lastName: string;
    role: string;
    mandate: string;
    jurisdiction: string;
    leadership: string;
    members: string;
    organization: string;
    tagline: string;
    bio: string;
    aboutImageUrl: string;
    spotlight: string;
    spotlightType: "banner" | "image" | "video";
    spotlightMediaUrl: string;
    announcements: ProfileAnnouncement[];
    phone: string;
    email: string;
    hours: string;
    website: string;
    address: string;
    mapUrl: string;
    socialLinks: { platform: string; label: string; url: string; avatarUrl?: string }[];
    highlights: string[];
    projects: { title: string; description: string; url: string; imageUrl: string; steps: { title: string; description: string; imageUrl: string }[] }[];
    showcaseMode: "PRODUCT_CATALOG" | "SERVICE_MENU" | "PROJECT_PROCESS";
    products: { name: string; description: string; imageUrl: string; price: string; currency: string; availability: "AVAILABLE" | "OUT_OF_STOCK" | "PREORDER" | "BY_REQUEST" }[];
    services: { name: string; description: string; imageUrl: string; price: string; currency: string; duration: string }[];
    credentials: { title: string; issuer: string; year: string; fileUrl: string; fileName: string; mimeType: string }[];
    reviews: { name: string; role: string; rating: number; quote: string }[];
    customFields: { id: string; label: string; type: ProfileFieldType; value: string }[];
    sectionVisibility: { projects: boolean; credentials: boolean; social: boolean; reviews: boolean; contact: boolean };
    qrPageBackground: string;
    qrFrame: "none" | "square" | "rounded" | "badge" | "circle" | "brand";
    qrDots: "square" | "round" | "circle" | "diamond" | "heart" | "line";
    qrLogoPlacement: "none" | "center" | "above";
  };
};

export const supportedLanguages = uniqueLocaleCodes.map((id) => ({
  id,
  label: localeMetadata[id].nativeName,
  localLabel: localeMetadata[id].nativeName,
})) as { id: LocaleCode; label: string; localLabel: string }[];

function emptyLocaleStrings(): Record<LocaleCode, string> {
  return Object.fromEntries(uniqueLocaleCodes.map((locale) => [locale, ""])) as Record<LocaleCode, string>;
}

export function emptyWizardForm(): WizardForm {
  return {
    purpose: null,
    title: "",
    description: "",
    branding: { brandName: "", logoUrl: "", accentColor: DEFAULT_ACCENT, qrForeground: DEFAULT_QR_FOREGROUND },
    landing: { summary: "", body: "", imageUrl: "", buttonLabel: "", buttonUrl: "" },
    vcard: { firstName: "", lastName: "", phone: "", email: "", organization: "", jobTitle: "", website: "", address: "" },
    socialLinks: [],
    menuItems: [{ name: "", category: "", categoryDescription: "", priceETB: "", description: "", imageUrl: "", isAvailable: true }],
    telebirr: { merchantName: "", merchantCode: "", checkoutUrl: "", metadata: [] },
    audioLinks: emptyLocaleStrings(),
    transcripts: emptyLocaleStrings(),
    localizedContent: {},
    tourismSummary: "",
    historicalMedia: [],
    gps: { latitude: "", longitude: "", altitudeMeters: "" },
    pdf: { fileUrl: "", fileName: "", assetId: "", fileSizeBytes: "", hostedAssetMetadata: [] },
    paymentUrl: "",
    profile: {
      sector: "OTHER",
      entityType: "ORGANIZATION",
      customSectorName: "",
      firstName: "",
      lastName: "",
      role: "",
      mandate: "",
      jurisdiction: "",
      leadership: "",
      members: "",
      organization: "",
      tagline: "",
      bio: "",
      aboutImageUrl: "",
      spotlight: "",
      spotlightType: "banner",
      spotlightMediaUrl: "",
      announcements: [],
      phone: "",
      email: "",
      hours: "",
      website: "",
      address: "",
      mapUrl: "",
      socialLinks: [],
      highlights: [],
      projects: [],
      showcaseMode: "PROJECT_PROCESS",
      products: [],
      services: [],
      credentials: [],
      reviews: [],
      customFields: [],
      sectionVisibility: { projects: true, credentials: true, social: true, reviews: true, contact: true },
      qrPageBackground: "#FFFFFF",
      qrFrame: "rounded",
      qrDots: "square",
      qrLogoPlacement: "center",
    },
  };
}

export function destinationForPurpose(purpose: WizardPurpose): "SECTOR_PROFILE" | "LANDING_PAGE" | "VCARD" | "MENU" | "TOURISM_AUDIO" | "PDF" | "URL" {
  if (purpose === "SECTOR_PROFILE") return "SECTOR_PROFILE";
  return purpose === "LOCAL_PAYMENTS" ? "URL" : purpose;
}

function valueAt(source: Record<string, unknown>, key: string): unknown {
  return source[key];
}

function stringAt(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === "string" ? value : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function recordToPairs(value: unknown): KeyValue[] {
  const record = asRecord(value);
  return Object.entries(record).flatMap(([key, item]) => typeof item === "string" ? [{ key, value: item }] : []);
}

function mediaKind(value: unknown): MediaKind {
  return value === "IMAGE" || value === "VIDEO" || value === "AUDIO" || value === "DOCUMENT" ? value : "DOCUMENT";
}

const legacyLocaleKeys: Partial<Record<LocaleCode, string>> = {
  en: "english",
  am: "amharic",
  om: "afaanOromoo",
  ti: "tigrigna",
};

function localeStringsFrom(value: unknown): Record<LocaleCode, string> {
  const source = asRecord(value);
  const entries = uniqueLocaleCodes.map((locale) => [
    locale,
    stringAt(source, locale) || stringAt(source, legacyLocaleKeys[locale] ?? ""),
  ] as const);
  return Object.fromEntries(entries) as Record<LocaleCode, string>;
}

function localizedContentFrom(value: unknown): LocalizedContent {
  const source = asRecord(value);
  const allowedFields = ["title", "description", "summary", "body", "buttonLabel", "displayName"] as const;
  const localized: LocalizedContent = {};
  for (const locale of uniqueLocaleCodes) {
    const entry = asRecord(source[locale]);
    const copy = Object.fromEntries(allowedFields.flatMap((field) => {
      const text = entry[field];
      return typeof text === "string" && text.trim() ? [[field, text]] : [];
    })) as LocalizedTextOverride;
    const fields = asRecord(entry.fields);
    const textFields = Object.fromEntries(Object.entries(fields).filter(([, text]) => typeof text === "string" && text.trim())) as Record<string, string>;
    if (Object.keys(textFields).length) copy.fields = textFields;
    if (Object.keys(copy).length) localized[locale] = copy;
  }
  return localized;
}

export function formFromRecord(destinationType: string, payloadValue: unknown, title: string, description: string | null): WizardForm {
  const form = emptyWizardForm();
  const payload = asRecord(payloadValue);
  form.title = title;
  form.description = description ?? "";
  const branding = asRecord(valueAt(payload, "branding"));
  form.branding = {
    brandName: stringAt(branding, "brandName"),
    logoUrl: stringAt(branding, "logoUrl"),
    accentColor: stringAt(branding, "accentColor") || DEFAULT_ACCENT,
    qrForeground: stringAt(branding, "qrForeground") || DEFAULT_QR_FOREGROUND,
  };
  form.localizedContent = localizedContentFrom(valueAt(payload, "localizedContent"));

  if (destinationType === "SECTOR_PROFILE") {
    const profile = asRecord(payload);
    const visibility = asRecord(profile.sectionVisibility);
    const rows = (key: string) => Array.isArray(profile[key]) ? profile[key] as unknown[] : [];
    const announcements = normalizeAnnouncements(profile.announcements ?? profile._announcements);
    const legacyAnnouncements = normalizeAnnouncements(undefined, {
      text: profile.spotlight ?? profile._spotlightText,
      badge: profile._spotlightTitle,
      link: profile._announcementLink,
      spotlightType: profile.spotlightType ?? profile._spotlightType,
      spotlightMediaUrl: profile.spotlightMediaUrl ?? profile._spotlightMediaUrl ?? profile._spotlightImage ?? profile._spotlightVideo,
    });
    for (const item of legacyAnnouncements) {
      const duplicate = announcements.some((existing) => (item.mediaUrl && existing.mediaUrl === item.mediaUrl) || (item.text && existing.text.trim() === item.text.trim() && existing.type === item.type));
      if (!duplicate) announcements.push(item);
    }
    form.purpose = "SECTOR_PROFILE";
    form.title = `${stringAt(profile, "firstName")} ${stringAt(profile, "lastName")}`.trim() || title;
    form.profile = {
      ...form.profile,
      sector: stringAt(profile, "sector") as WizardForm["profile"]["sector"],
      entityType: (stringAt(profile, "entityType") || "ORGANIZATION") as WizardForm["profile"]["entityType"],
      customSectorName: stringAt(profile, "customSectorName"),
      firstName: stringAt(profile, "firstName"),
      lastName: stringAt(profile, "lastName"),
      role: stringAt(profile, "role"),
      mandate: stringAt(profile, "mandate"),
      jurisdiction: stringAt(profile, "jurisdiction"),
      leadership: stringAt(profile, "leadership"),
      members: stringAt(profile, "members"),
      organization: stringAt(profile, "organization"),
      tagline: stringAt(profile, "tagline"),
      bio: stringAt(profile, "bio"),
      aboutImageUrl: stringAt(profile, "aboutImageUrl"),
      spotlight: "",
      spotlightType: "banner",
      spotlightMediaUrl: "",
      announcements: announcements.slice(0, 5),
      phone: stringAt(profile, "phone"),
      email: stringAt(profile, "email"),
      hours: stringAt(profile, "hours"),
      website: stringAt(profile, "website"),
      address: stringAt(profile, "address"),
      mapUrl: stringAt(profile, "mapUrl"),
      socialLinks: rows("socialLinks").map((item) => { const row = asRecord(item); return { platform: stringAt(row, "platform"), label: stringAt(row, "label"), url: stringAt(row, "url"), avatarUrl: stringAt(row, "avatarUrl") }; }),
      highlights: rows("highlights").filter((item): item is string => typeof item === "string"),
      projects: rows("projects").map((item) => { const row = asRecord(item); const steps = Array.isArray(row.steps) ? row.steps.map((step) => asRecord(step)) : []; return { title: stringAt(row, "title"), description: stringAt(row, "description"), url: stringAt(row, "url"), imageUrl: stringAt(row, "imageUrl"), steps: steps.map((step) => ({ title: stringAt(step, "title"), description: stringAt(step, "description"), imageUrl: stringAt(step, "imageUrl") })) }; }),
      showcaseMode: (stringAt(profile, "showcaseMode") || defaultShowcaseMode(stringAt(profile, "sector"))) as WizardForm["profile"]["showcaseMode"],
      products: rows("products").map((item) => { const row = asRecord(item); return { name: stringAt(row, "name"), description: stringAt(row, "description"), imageUrl: stringAt(row, "imageUrl"), price: typeof row.price === "number" ? String(row.price) : "", currency: stringAt(row, "currency") || "ETB", availability: (stringAt(row, "availability") || "AVAILABLE") as WizardForm["profile"]["products"][number]["availability"] }; }),
      services: rows("services").map((item) => { const row = asRecord(item); return { name: stringAt(row, "name"), description: stringAt(row, "description"), imageUrl: stringAt(row, "imageUrl"), price: typeof row.price === "number" ? String(row.price) : "", currency: stringAt(row, "currency") || "ETB", duration: stringAt(row, "duration") }; }),
      credentials: rows("credentials").map((item) => { const row = asRecord(item); return { title: stringAt(row, "title"), issuer: stringAt(row, "issuer"), year: stringAt(row, "year"), fileUrl: stringAt(row, "fileUrl"), fileName: stringAt(row, "fileName"), mimeType: stringAt(row, "mimeType") || "application/pdf" }; }),
      reviews: rows("reviews").map((item) => { const row = asRecord(item); return { name: stringAt(row, "name"), role: stringAt(row, "role"), rating: typeof row.rating === "number" ? row.rating : 5, quote: stringAt(row, "quote") }; }),
      customFields: rows("customFields").map((item) => { const row = asRecord(item); return { id: stringAt(row, "id"), label: stringAt(row, "label"), type: stringAt(row, "type") as WizardForm["profile"]["customFields"][number]["type"], value: stringAt(row, "value") }; }),
      sectionVisibility: { projects: visibility.projects !== false, credentials: visibility.credentials !== false, social: visibility.social !== false, reviews: visibility.reviews !== false, contact: visibility.contact !== false },
      qrPageBackground: stringAt(profile, "qrPageBackground") || "#FFFFFF",
      qrFrame: (stringAt(profile, "qrFrame") || "rounded") as WizardForm["profile"]["qrFrame"],
      qrDots: (stringAt(profile, "qrDots") || "square") as WizardForm["profile"]["qrDots"],
      qrLogoPlacement: (stringAt(profile, "qrLogoPlacement") || "center") as WizardForm["profile"]["qrLogoPlacement"],
    };
    return form;
  }

  if (destinationType === "LANDING_PAGE") {
    form.purpose = "LANDING_PAGE";
    form.landing = {
      summary: stringAt(payload, "summary"),
      body: stringAt(payload, "body"),
      imageUrl: stringAt(payload, "imageUrl"),
      buttonLabel: stringAt(payload, "buttonLabel"),
      buttonUrl: stringAt(payload, "buttonUrl"),
    };
    form.title = stringAt(payload, "title") || title;
  } else if (destinationType === "VCARD") {
    form.purpose = "VCARD";
    form.vcard = {
      firstName: stringAt(payload, "firstName"),
      lastName: stringAt(payload, "lastName"),
      phone: stringAt(payload, "phone"),
      email: stringAt(payload, "email"),
      organization: stringAt(payload, "organization"),
      jobTitle: stringAt(payload, "jobTitle"),
      website: stringAt(payload, "website"),
      address: stringAt(payload, "address"),
    };
    form.socialLinks = Array.isArray(valueAt(payload, "socialLinks"))
      ? (valueAt(payload, "socialLinks") as unknown[]).map((value) => {
          const link = asRecord(value);
          return { platform: stringAt(link, "platform"), label: stringAt(link, "label"), url: stringAt(link, "url") };
        })
      : [];
  } else if (destinationType === "MENU") {
    form.purpose = "MENU";
    form.title = stringAt(payload, "displayName") || title;
    const categories = Array.isArray(valueAt(payload, "categories")) ? valueAt(payload, "categories") as unknown[] : [];
    form.menuItems = categories.flatMap((value) => {
      const category = asRecord(value);
      const items = Array.isArray(valueAt(category, "items")) ? valueAt(category, "items") as unknown[] : [];
      return items.map((itemValue) => {
        const item = asRecord(itemValue);
        const price = item["priceETB"];
        return {
          name: stringAt(item, "name"),
          category: stringAt(category, "name") || "Main menu",
          categoryDescription: stringAt(category, "description"),
          priceETB: typeof price === "number" ? String(price) : "",
          description: stringAt(item, "description"),
          imageUrl: stringAt(item, "imageUrl"),
          isAvailable: item["isAvailable"] !== false,
        };
      });
    });
    if (!form.menuItems.length) form.menuItems = emptyWizardForm().menuItems;
    const checkout = asRecord(valueAt(payload, "telebirrCheckout"));
    form.telebirr = {
      merchantName: stringAt(checkout, "merchantName"),
      merchantCode: stringAt(checkout, "merchantCode"),
      checkoutUrl: stringAt(checkout, "checkoutUrl"),
      metadata: recordToPairs(checkout["metadata"]),
    };
  } else if (destinationType === "TOURISM_AUDIO") {
    form.purpose = "TOURISM_AUDIO";
    const links = asRecord(valueAt(payload, "audioLinks"));
    const transcripts = asRecord(valueAt(payload, "transcripts"));
    const gps = asRecord(valueAt(payload, "gps"));
    form.audioLinks = localeStringsFrom(links);
    form.transcripts = localeStringsFrom(transcripts);
    form.tourismSummary = stringAt(payload, "summary");
    form.gps = {
      latitude: typeof gps["latitude"] === "number" ? String(gps["latitude"]) : "",
      longitude: typeof gps["longitude"] === "number" ? String(gps["longitude"]) : "",
      altitudeMeters: typeof gps["altitudeMeters"] === "number" ? String(gps["altitudeMeters"]) : "",
    };
    form.historicalMedia = Array.isArray(valueAt(payload, "historicalMedia"))
      ? (valueAt(payload, "historicalMedia") as unknown[]).map((value) => {
          const item = asRecord(value);
          return {
            kind: mediaKind(item["kind"]),
            url: stringAt(item, "url"),
            title: stringAt(item, "title"),
            caption: stringAt(item, "caption"),
            assetId: stringAt(item, "assetId"),
          };
        })
      : [];
  } else if (destinationType === "PDF") {
    form.purpose = "PDF";
    const fileSize = payload["fileSizeBytes"];
    form.pdf = {
      fileUrl: stringAt(payload, "fileUrl"),
      fileName: stringAt(payload, "fileName"),
      assetId: stringAt(payload, "assetId"),
      fileSizeBytes: typeof fileSize === "number" ? String(fileSize) : "",
      hostedAssetMetadata: recordToPairs(payload["hostedAssetMetadata"]),
    };
  } else if (destinationType === "URL") {
    form.purpose = "LOCAL_PAYMENTS";
    form.paymentUrl = stringAt(payload, "url");
  }

  return form;
}

function optional(value: string): string | undefined {
  return value.trim() || undefined;
}

function optionalWebUrl(value: string): string | undefined {
  return optional(value);
}

function isSafeLogoUrl(value: string): boolean {
  if (!value) return true;
  if (value.startsWith("/manus-storage/")) {
    const key = value.slice("/manus-storage/".length);
    return Boolean(key) && /^[A-Za-z0-9._/-]+$/.test(key) && !key.includes("..") && !key.includes("//") && !key.endsWith("/");
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function pairsToRecord(pairs: KeyValue[]): Record<string, string> | undefined {
  const entries = pairs.flatMap(({ key, value }) => key.trim() && value.trim() ? [[key.trim(), value.trim()] as const] : []);
  return entries.length ? Object.fromEntries(entries) : undefined;
}

export type WizardValidationError = { key: MessageKey };

export function validateWizardForm(form: WizardForm): WizardValidationError | null {
  if (!form.purpose) return { key: "validation.choosePurpose" };
  if (!form.title.trim()) return { key: "validation.titleRequired" };
  if (form.branding.brandName.trim().length > 120) return { key: "validation.brandNameTooLong" };
  if (!/^#[\da-f]{6}$/i.test(form.branding.accentColor)) return { key: "validation.invalidAccent" };
  if (!isScanSafeQrForeground(form.branding.qrForeground)) return { key: "validation.qrContrast" };
  if (!isSafeLogoUrl(form.branding.logoUrl.trim())) return { key: "validation.logoUrl" };

  if (form.purpose === "SECTOR_PROFILE") {
    if (!form.profile.firstName.trim() || !form.profile.lastName.trim()) return { key: "validation.profileNameRequired" };
    if (!form.profile.role.trim()) return { key: "validation.profileRoleRequired" };
    if (form.profile.sector === "OTHER" && !form.profile.customSectorName.trim()) return { key: "validation.customSectorRequired" };
    if (form.profile.email.trim() && !/^\S+@\S+\.\S+$/.test(form.profile.email.trim())) return { key: "validation.email" };
    if (form.profile.website.trim() && !/^https?:\/\//i.test(form.profile.website.trim())) return { key: "validation.profileWebsite" };
    if (form.profile.mapUrl.trim() && !/^https?:\/\//i.test(form.profile.mapUrl.trim())) return { key: "validation.profileMapUrl" };
    if (form.profile.socialLinks.some((link) => link.url.trim() && !/^https?:\/\//i.test(link.url.trim()))) return { key: "validation.profileSocialUrl" };
    if (form.profile.announcements.some((item) => item.link?.trim() && !/^https?:\/\//i.test(item.link.trim()))) return { key: "validation.profileWebsite" };
    if (form.profile.announcements.some((item) => item.mediaUrl?.trim() && !/^https?:\/\//i.test(item.mediaUrl.trim()))) return { key: "validation.profileFileUrl" };
    if (form.profile.announcements.some((item) => item.type && item.type !== "text" && (item.text.trim() || item.badge?.trim() || item.link?.trim()) && !item.mediaUrl?.trim())) return { key: "validation.profileFileUrl" };
    if (form.profile.projects.some((project) => [project.url, project.imageUrl].some((url) => url.trim() && !/^https?:\/\//i.test(url.trim())))) return { key: "validation.profileProjectUrl" };
    if (form.profile.projects.some((project) => project.steps.some((step) => step.imageUrl.trim() && !/^https?:\/\//i.test(step.imageUrl.trim())))) return { key: "validation.profileProjectUrl" };
    if (form.profile.products.some((item) => (item.imageUrl.trim() && !/^https?:\/\//i.test(item.imageUrl.trim())) || (item.price.trim() && (!Number.isFinite(Number(item.price)) || Number(item.price) < 0)))) return { key: "validation.profileProjectUrl" };
    if (form.profile.services.some((item) => (item.imageUrl.trim() && !/^https?:\/\//i.test(item.imageUrl.trim())) || (item.price.trim() && (!Number.isFinite(Number(item.price)) || Number(item.price) < 0)))) return { key: "validation.profileProjectUrl" };
    if (form.profile.credentials.some((credential) => !/^https?:\/\//i.test(credential.fileUrl.trim()))) return { key: "validation.profileFileUrl" };
  }

  if (form.purpose === "LANDING_PAGE") {
    if (form.landing.imageUrl.trim() && !/^https?:\/\//i.test(form.landing.imageUrl.trim())) return { key: "validation.imageUrl" };
    if (form.landing.buttonUrl.trim() && !/^https?:\/\//i.test(form.landing.buttonUrl.trim())) return { key: "validation.buttonUrl" };
  }
  if (form.purpose === "VCARD") {
    if (!form.vcard.firstName.trim() || !form.vcard.lastName.trim()) return { key: "validation.contactNames" };
    if (form.vcard.email.trim() && !/^\S+@\S+\.\S+$/.test(form.vcard.email.trim())) return { key: "validation.email" };
  }
  if (form.purpose === "MENU") {
    const items = form.menuItems.filter((item) => item.name.trim());
    if (!items.length) return { key: "validation.menuItemRequired" };
    if (items.some((item) => !item.category.trim() || !item.priceETB.trim() || !Number.isFinite(Number(item.priceETB)) || Number(item.priceETB) < 0)) return { key: "validation.menuCategoryPrice" };
    if (items.some((item) => item.imageUrl.trim() && !/^https?:\/\//i.test(item.imageUrl.trim()))) return { key: "validation.menuImageUrl" };
    if (form.telebirr.checkoutUrl.trim() && !/^https?:\/\//i.test(form.telebirr.checkoutUrl.trim())) return { key: "validation.checkoutUrl" };
  }
  if (form.purpose === "TOURISM_AUDIO") {
    if (!Object.values(form.audioLinks).some((link) => link.trim())) return { key: "validation.audioRequired" };
    if (!form.gps.latitude.trim() || !form.gps.longitude.trim() || !Number.isFinite(Number(form.gps.latitude)) || !Number.isFinite(Number(form.gps.longitude))) return { key: "validation.coordinates" };
    const latitude = Number(form.gps.latitude);
    const longitude = Number(form.gps.longitude);
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return { key: "validation.gpsRange" };
    if (Object.values(form.audioLinks).some((link) => link.trim() && !/^https?:\/\//i.test(link.trim()))) return { key: "validation.audioUrl" };
    if (form.historicalMedia.some((item) => item.url.trim() && !/^https?:\/\//i.test(item.url.trim()))) return { key: "validation.mediaUrl" };
  }
  if (form.purpose === "PDF") {
    if (!form.pdf.fileUrl.trim() || !/^https?:\/\//i.test(form.pdf.fileUrl.trim())) return { key: "validation.pdfUrl" };
    if (!form.pdf.fileName.trim()) return { key: "validation.pdfFileName" };
    if (form.pdf.fileSizeBytes.trim() && (!Number.isInteger(Number(form.pdf.fileSizeBytes)) || Number(form.pdf.fileSizeBytes) <= 0)) return { key: "validation.fileSize" };
  }
  if (form.purpose === "LOCAL_PAYMENTS" && !/^https?:\/\//i.test(form.paymentUrl.trim())) return { key: "validation.paymentUrl" };

  return null;
}

export function buildDestinationPayload(form: WizardForm): Record<string, unknown> {
  const branding: Record<string, string> = {};
  if (form.branding.brandName.trim()) branding.brandName = form.branding.brandName.trim();
  if (form.branding.logoUrl.trim()) branding.logoUrl = form.branding.logoUrl.trim();
  if (form.branding.accentColor.toUpperCase() !== DEFAULT_ACCENT) branding.accentColor = form.branding.accentColor.toUpperCase();
  if (form.branding.qrForeground.toUpperCase() !== DEFAULT_QR_FOREGROUND) branding.qrForeground = form.branding.qrForeground.toUpperCase();
  const localizedContent: LocalizedContent = {};
  for (const locale of uniqueLocaleCodes) {
    const source = form.localizedContent[locale];
    if (!source) continue;
    const copy: LocalizedTextOverride = {};
    for (const field of ["title", "description", "summary", "body", "buttonLabel", "displayName"] as const) {
      const value = source[field];
      if (typeof value === "string" && value.trim()) copy[field] = value.trim();
    }
    if (source.fields) {
      const fields = Object.fromEntries(Object.entries(source.fields).filter(([, value]) => value.trim()).map(([key, value]) => [key, value.trim()]));
      if (Object.keys(fields).length) copy.fields = fields;
    }
    if (Object.keys(copy).length) localizedContent[locale] = copy;
  }
  const withBranding = (payload: Record<string, unknown>) => ({
    ...payload,
    ...(form.description.trim() ? { description: form.description.trim() } : {}),
    ...(Object.keys(localizedContent).length ? { localizedContent } : {}),
    ...(Object.keys(branding).length ? { branding } : {}),
  });

  if (form.purpose === "SECTOR_PROFILE") {
    return withBranding({
      profileVersion: 1,
      sector: form.profile.sector,
      entityType: form.profile.entityType,
      customSectorName: optional(form.profile.customSectorName),
      firstName: form.profile.firstName.trim(),
      lastName: form.profile.lastName.trim(),
      role: optional(form.profile.role),
      mandate: optional(form.profile.mandate),
      jurisdiction: optional(form.profile.jurisdiction),
      leadership: optional(form.profile.leadership),
      members: optional(form.profile.members),
      organization: optional(form.profile.organization),
      tagline: optional(form.profile.tagline),
      bio: optional(form.profile.bio),
      aboutImageUrl: optionalWebUrl(form.profile.aboutImageUrl),
      spotlight: optional(form.profile.spotlight),
      spotlightType: form.profile.spotlightType,
      spotlightMediaUrl: optionalWebUrl(form.profile.spotlightMediaUrl),
      announcements: form.profile.announcements
        .filter((item) => item.text.trim() || item.mediaUrl?.trim())
        .map((item) => ({
          ...(item.text.trim() ? { text: item.text.trim() } : {}),
          type: item.type ?? (item.mediaUrl ? "image" : "text"),
          badge: optional(item.badge ?? ""),
          link: optionalWebUrl(item.link ?? ""),
          mediaUrl: optionalWebUrl(item.mediaUrl ?? ""),
        })),
      phone: optional(form.profile.phone),
      email: optional(form.profile.email),
      hours: optional(form.profile.hours),
      website: optionalWebUrl(form.profile.website),
      address: optional(form.profile.address),
      mapUrl: optionalWebUrl(form.profile.mapUrl),
      socialLinks: form.profile.socialLinks.filter((item) => item.url.trim()).map((item) => ({ platform: item.platform.trim() || "Social", label: item.label.trim() || item.platform.trim() || "Profile", url: item.url.trim(), ...(item.avatarUrl?.trim() ? { avatarUrl: item.avatarUrl.trim() } : {}) })),
      highlights: form.profile.highlights.map((item) => item.trim()).filter(Boolean),
      projects: form.profile.projects.filter((item) => item.title.trim()).map((item) => ({ title: item.title.trim(), description: optional(item.description), url: optionalWebUrl(item.url), imageUrl: optionalWebUrl(item.imageUrl), steps: item.steps.filter((step) => step.title.trim() || step.description.trim() || step.imageUrl.trim()).map((step) => ({ title: step.title.trim() || "Step", description: optional(step.description), imageUrl: optionalWebUrl(step.imageUrl) })) })),
      showcaseMode: form.profile.showcaseMode,
      products: form.profile.products.filter((item) => item.name.trim()).map((item) => ({ name: item.name.trim(), description: optional(item.description), imageUrl: optionalWebUrl(item.imageUrl), price: item.price.trim() ? Number(item.price) : undefined, currency: optional(item.currency), availability: item.availability })),
      services: form.profile.services.filter((item) => item.name.trim()).map((item) => ({ name: item.name.trim(), description: optional(item.description), imageUrl: optionalWebUrl(item.imageUrl), price: item.price.trim() ? Number(item.price) : undefined, currency: optional(item.currency), duration: optional(item.duration) })),
      credentials: form.profile.credentials.filter((item) => item.fileUrl.trim()).map((item) => ({ title: item.title.trim(), issuer: optional(item.issuer), year: optional(item.year), fileUrl: item.fileUrl.trim(), fileName: item.fileName.trim(), mimeType: item.mimeType })),
      reviews: form.profile.reviews.filter((item) => item.quote.trim()).map((item) => ({ name: item.name.trim(), role: optional(item.role), rating: item.rating, quote: item.quote.trim() })),
      customFields: form.profile.customFields.filter((item) => item.label.trim() && item.value.trim()).map((item) => ({ id: item.id.trim() || `field-${Math.random().toString(36).slice(2, 8)}`, label: item.label.trim(), type: item.type, value: item.value.trim() })),
      sectionVisibility: form.profile.sectionVisibility,
      qrPageBackground: form.profile.qrPageBackground,
      qrFrame: form.profile.qrFrame,
      qrDots: form.profile.qrDots,
      qrLogoPlacement: form.profile.qrLogoPlacement,
    });
  }

  if (form.purpose === "LANDING_PAGE") {
    return withBranding({
      title: form.title.trim(),
      summary: optional(form.landing.summary),
      body: optional(form.landing.body),
      imageUrl: optionalWebUrl(form.landing.imageUrl),
      buttonLabel: optional(form.landing.buttonLabel),
      buttonUrl: optionalWebUrl(form.landing.buttonUrl),
    });
  }

  if (form.purpose === "VCARD") {
    return withBranding({
      firstName: form.vcard.firstName.trim(),
      lastName: form.vcard.lastName.trim(),
      phone: optional(form.vcard.phone),
      email: optional(form.vcard.email),
      organization: optional(form.vcard.organization),
      jobTitle: optional(form.vcard.jobTitle),
      website: optionalWebUrl(form.vcard.website),
      address: optional(form.vcard.address),
      socialLinks: form.socialLinks.filter((link) => link.url.trim()).map((link) => ({ platform: link.platform.trim() || "Social", label: link.label.trim() || link.platform.trim() || "Profile", url: link.url.trim() })),
    });
  }

  if (form.purpose === "MENU") {
    const grouped = new Map<string, { name: string; description?: string; items: { name: string; description?: string; priceETB: number; imageUrl?: string; isAvailable: boolean }[] }>();
    for (const item of form.menuItems.filter((row) => row.name.trim())) {
      const categoryName = item.category.trim() || "Main menu";
      const category = grouped.get(categoryName) ?? { name: categoryName, description: optional(item.categoryDescription), items: [] };
      if (!category.description && item.categoryDescription.trim()) category.description = item.categoryDescription.trim();
      category.items.push({
        name: item.name.trim(),
        description: optional(item.description),
        priceETB: Number(item.priceETB),
        imageUrl: optionalWebUrl(item.imageUrl),
        isAvailable: item.isAvailable,
      });
      grouped.set(categoryName, category);
    }
    const metadata = pairsToRecord(form.telebirr.metadata);
    const checkout = form.telebirr.checkoutUrl.trim() || form.telebirr.merchantCode.trim() || form.telebirr.merchantName.trim() || metadata
      ? {
          merchantName: form.telebirr.merchantName.trim() || "Telebirr merchant",
          merchantCode: optional(form.telebirr.merchantCode),
          checkoutUrl: optionalWebUrl(form.telebirr.checkoutUrl),
          metadata,
        }
      : undefined;
    return withBranding({ displayName: form.title.trim(), categories: [...grouped.values()], telebirrCheckout: checkout });
  }

  if (form.purpose === "TOURISM_AUDIO") {
    const audioLinks = Object.fromEntries(Object.entries(form.audioLinks).filter(([, link]) => link.trim()).map(([language, link]) => [language, link.trim()]));
    const transcripts = Object.fromEntries(Object.entries(form.transcripts).filter(([, text]) => text.trim()).map(([language, text]) => [language, text.trim()]));
    const altitudeMeters = optional(form.gps.altitudeMeters);
    return withBranding({
      title: form.title.trim(),
      summary: optional(form.tourismSummary),
      audioLinks,
      transcripts: Object.keys(transcripts).length ? transcripts : undefined,
      gps: {
        latitude: Number(form.gps.latitude),
        longitude: Number(form.gps.longitude),
        altitudeMeters: altitudeMeters ? Number(altitudeMeters) : undefined,
      },
      historicalMedia: form.historicalMedia.filter((item) => item.url.trim()).map((item) => ({
        kind: item.kind,
        url: item.url.trim(),
        title: optional(item.title),
        caption: optional(item.caption),
        assetId: optional(item.assetId),
      })),
    });
  }

  if (form.purpose === "PDF") {
    const metadata = pairsToRecord(form.pdf.hostedAssetMetadata);
    return withBranding({
      title: form.title.trim(),
      fileUrl: form.pdf.fileUrl.trim(),
      fileName: form.pdf.fileName.trim(),
      mimeType: "application/pdf",
      fileSizeBytes: form.pdf.fileSizeBytes.trim() ? Number(form.pdf.fileSizeBytes) : undefined,
      assetId: optional(form.pdf.assetId),
      hostedAssetMetadata: metadata,
    });
  }

  return withBranding({ url: form.paymentUrl.trim() });
}
