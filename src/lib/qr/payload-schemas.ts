import { z } from "zod";
import { brandIdentitySchema, isQrForegroundContrastSafe } from "@/lib/qr/brand";
import { isLocaleCode, uniqueLocaleCodes, type LocaleCode } from "@/i18n/registry";
import { profileFieldTypes, sectorOptions } from "@/lib/profile/sectors";

const webUrl = z
  .string()
  .url()
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  }, "URL must use HTTP or HTTPS.");

const optionalText = (max = 500) => z.string().trim().max(max).optional();

const localizedFieldMapSchema = z
  .record(z.string().trim().min(1).max(160).regex(/^[A-Za-z0-9_.:\[\]-]+$/), z.string().trim().max(20000))
  .refine((fields) => Object.keys(fields).length <= 200, "At most 200 localized field overrides are allowed.");

export const localizedTextOverrideSchema = z
  .object({
    title: optionalText(160),
    description: optionalText(5000),
    summary: optionalText(1500),
    body: optionalText(10000),
    buttonLabel: optionalText(60),
    displayName: optionalText(160),
    fields: localizedFieldMapSchema.optional(),
  })
  .strict();

export const localizedContentSchema = z
  .record(z.string(), localizedTextOverrideSchema)
  .superRefine((content, context) => {
    if (Object.keys(content).length > uniqueLocaleCodes.length) {
      context.addIssue({ code: "custom", message: "Localized content supports at most 13 locales." });
    }
    for (const locale of Object.keys(content)) {
      if (!isLocaleCode(locale)) {
        context.addIssue({ code: "custom", path: [locale], message: `Unsupported localized content locale: ${locale}.` });
      }
    }
  })
  .optional();

export const destinationTypeSchema = z.enum([
  "LANDING_PAGE",
  "URL",
  "VCARD",
  "MENU",
  "TOURISM_AUDIO",
  "PDF",
  "SECTOR_PROFILE",
]);

const sectorIdSchema = z.enum(sectorOptions.map((sector) => sector.id) as [string, ...string[]]);
const profileFieldTypeSchema = z.enum(profileFieldTypes.map((field) => field.id) as [string, ...string[]]);
const profileUrl = webUrl.optional();

type ProfileShowcaseChildPayload = {
  title?: string;
  description?: string;
  imageUrl?: string;
  price?: number;
  currency?: string;
  badge?: string;
  link?: string;
  children?: ProfileShowcaseChildPayload[];
  attachments?: { url: string; fileName: string; mimeType: string; fileSizeBytes?: number }[];
};

const profileShowcaseChildSchema: z.ZodType<ProfileShowcaseChildPayload> = z.lazy(() => z.object({
  title: optionalText(180),
  description: optionalText(1200),
  imageUrl: profileUrl,
  price: z.number().finite().nonnegative().optional(),
  currency: z.string().trim().max(12).optional(),
  badge: optionalText(80),
  link: profileUrl,
  children: profileShowcaseChildSchema.array().max(20).optional(),
  attachments: z.array(z.object({ url: webUrl, fileName: z.string().trim().min(1).max(255), mimeType: z.string().trim().max(120), fileSizeBytes: z.number().int().nonnegative().optional() }).strict()).max(10).optional(),
}).strict());

const profileSocialLinkSchema = z.object({
  platform: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1).max(100),
  url: webUrl,
  avatarUrl: webUrl.optional(),
}).strict();

const profileProjectStepSchema = z.object({
  title: optionalText(180),
  description: optionalText(1200),
  imageUrl: profileUrl,
  link: profileUrl,
  children: profileShowcaseChildSchema.array().max(20).optional(),
}).strict();
const profileProjectSchema = z.object({
  title: z.string().trim().min(1).max(180),
  description: optionalText(2000),
  url: profileUrl,
  imageUrl: profileUrl,
  steps: z.array(profileProjectStepSchema).max(20).default([]),
}).strict();

const profileProductSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: optionalText(1200),
  imageUrl: profileUrl,
  price: z.number().finite().nonnegative().optional(),
  currency: z.string().trim().max(12).optional(),
  availability: z.enum(["AVAILABLE", "OUT_OF_STOCK", "PREORDER", "BY_REQUEST"]).default("AVAILABLE"),
  variants: z.array(profileShowcaseChildSchema).max(30).optional(),
}).strict();

const profileServiceSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: optionalText(1200),
  imageUrl: profileUrl,
  price: z.number().finite().nonnegative().optional(),
  currency: z.string().trim().max(12).optional(),
  duration: optionalText(80),
  children: z.array(profileShowcaseChildSchema).max(30).optional(),
}).strict();

const profileCredentialSchema = z.object({
  title: z.string().trim().min(1).max(180),
  issuer: optionalText(160),
  year: z.string().trim().max(20).optional(),
  fileUrl: webUrl,
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(["application/pdf", "image/png", "image/jpeg", "image/webp"]).default("application/pdf"),
}).strict();

const profileReviewSchema = z.object({
  name: z.string().trim().min(1).max(120),
  role: optionalText(160),
  rating: z.number().int().min(1).max(5),
  quote: z.string().trim().min(1).max(1200),
}).strict();

const profileCustomFieldSchema = z.object({
  id: z.string().trim().min(1).max(60).regex(/^[A-Za-z0-9_-]+$/),
  label: z.string().trim().min(1).max(120),
  type: profileFieldTypeSchema,
  value: z.string().trim().max(2000),
}).strict();

const profileAnnouncementSchema = z.object({
  text: z.string().trim().max(500).optional(),
  badge: optionalText(40),
  link: profileUrl,
  type: z.enum(["text", "image", "video"]).optional(),
  mediaUrl: profileUrl,
}).strict().superRefine((announcement, context) => {
  const type = announcement.type ?? (announcement.mediaUrl ? "image" : "text");
  if (type === "text" && !announcement.text?.trim()) {
    context.addIssue({ code: "custom", path: ["text"], message: "Text announcements must include text." });
  }
  if ((type === "image" || type === "video") && !announcement.mediaUrl) {
    context.addIssue({ code: "custom", path: ["mediaUrl"], message: "Image and video announcements must include media." });
  }
});

export const sectorProfilePayloadSchema = z.object({
  profileVersion: z.literal(1).default(1),
  sector: sectorIdSchema,
  customSectorName: z.string().trim().max(120).optional(),
  entityType: z.enum(["INDIVIDUAL", "ORGANIZATION", "GROUP", "GOVERNANCE"]).default("ORGANIZATION"),
  firstName: optionalText(100),
  lastName: optionalText(100),
  role: optionalText(160),
  mandate: optionalText(1200),
  jurisdiction: optionalText(240),
  leadership: optionalText(1200),
  members: optionalText(1200),
  organization: optionalText(160),
  tagline: optionalText(240),
  highlights: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
  bio: optionalText(5000),
  aboutImageUrl: profileUrl,
  spotlight: optionalText(500),
  announcements: z.array(profileAnnouncementSchema).max(30).optional(),
  spotlightType: z.enum(["banner", "image", "video"]).default("banner"),
  spotlightMediaUrl: profileUrl,
  phone: optionalText(60),
  email: z.string().trim().email().optional(),
  hours: optionalText(500),
  website: profileUrl,
  address: optionalText(400),
  mapUrl: profileUrl,
  socialLinks: z.array(profileSocialLinkSchema).max(20).default([]),
  projects: z.array(profileProjectSchema).max(30).default([]),
  showcaseMode: z.enum(["PRODUCT_CATALOG", "SERVICE_MENU", "PROJECT_PROCESS"]).default("PROJECT_PROCESS"),
  products: z.array(profileProductSchema).max(100).default([]),
  services: z.array(profileServiceSchema).max(100).default([]),
  credentials: z.array(profileCredentialSchema).max(30).default([]),
  reviews: z.array(profileReviewSchema).max(30).default([]),
  customFields: z.array(profileCustomFieldSchema).max(30).default([]),
  sectionVisibility: z.object({
    projects: z.boolean().default(true),
    credentials: z.boolean().default(true),
    social: z.boolean().default(true),
    reviews: z.boolean().default(true),
    contact: z.boolean().default(true),
  }).default({ projects: true, credentials: true, social: true, reviews: true, contact: true }),
  qrPageBackground: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#FFFFFF"),
  qrEyeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).refine(isQrForegroundContrastSafe, "QR eye and frame color must have at least 4.5:1 contrast against white.").default("#0F172A"),
  qrFrame: z.enum(["square", "rounded", "badge", "none", "circle", "brand"]).default("rounded"),
  qrDots: z.enum(["square", "round", "circle", "diamond", "heart", "line"]).default("square"),
  qrLogoPlacement: z.enum(["none", "center", "above"]).default("center"),
  localizedContent: localizedContentSchema,
  branding: brandIdentitySchema.optional(),
}).strict().superRefine((profile, context) => {
  if (profile.entityType === "INDIVIDUAL" && (!profile.firstName || !profile.lastName || !profile.role)) context.addIssue({ code: "custom", path: ["firstName"], message: "Add the person’s name and profession." });
  if (profile.entityType !== "INDIVIDUAL" && !profile.organization) context.addIssue({ code: "custom", path: ["organization"], message: "Add the organization or group name." });
  if (profile.entityType === "GOVERNANCE" && !profile.mandate) context.addIssue({ code: "custom", path: ["mandate"], message: "Add the public mandate." });
  if (profile.sector === "OTHER" && !profile.customSectorName?.trim()) {
    context.addIssue({ code: "custom", path: ["customSectorName"], message: "A custom sector name is required." });
  }
});

export const landingPagePayloadSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    description: optionalText(5000),
    summary: optionalText(1000),
    body: optionalText(10000),
    imageUrl: webUrl.optional(),
    buttonLabel: z.string().trim().min(1).max(60).optional(),
    buttonUrl: webUrl.optional(),
    localizedContent: localizedContentSchema,
    branding: brandIdentitySchema.optional(),
  })
  .strict();

export const urlPayloadSchema = z.object({
  url: webUrl,
  description: optionalText(5000),
  localizedContent: localizedContentSchema,
  branding: brandIdentitySchema.optional(),
}).strict();

const socialLinkSchema = z
  .object({
    platform: z.string().trim().min(1).max(40),
    label: z.string().trim().min(1).max(80),
    url: webUrl,
  })
  .strict();

export const vCardPayloadSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    organization: optionalText(160),
    jobTitle: optionalText(120),
    email: z.string().trim().email().optional(),
    phone: optionalText(40),
    website: webUrl.optional(),
    address: optionalText(300),
    description: optionalText(5000),
    socialLinks: z.array(socialLinkSchema).max(20).default([]),
    localizedContent: localizedContentSchema,
    branding: brandIdentitySchema.optional(),
  })
  .strict();

const menuItemSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: optionalText(600),
    priceETB: z.number().finite().min(0),
    imageUrl: webUrl.optional(),
    isAvailable: z.boolean().default(true),
  })
  .strict();

const menuCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    description: optionalText(300),
    items: z.array(menuItemSchema).min(1).max(250),
  })
  .strict();

const telebirrCheckoutSchema = z
  .object({
    merchantName: z.string().trim().min(1).max(120),
    merchantCode: optionalText(80),
    checkoutUrl: webUrl.optional(),
    metadata: z.record(z.string(), z.string().max(500)).optional(),
  })
  .strict();

export const menuPayloadSchema = z
  .object({
    displayName: z.string().trim().min(1).max(160),
    description: optionalText(5000),
    categories: z.array(menuCategorySchema).min(1).max(100),
    telebirrCheckout: telebirrCheckoutSchema.optional(),
    localizedContent: localizedContentSchema,
    branding: brandIdentitySchema.optional(),
  })
  .strict();

const mediaItemSchema = z
  .object({
    kind: z.enum(["IMAGE", "VIDEO", "AUDIO", "DOCUMENT"]),
    url: webUrl,
    title: optionalText(160),
    caption: optionalText(1000),
    assetId: optionalText(160),
  })
  .strict();

const audioLocaleLinkShape = {
  en: webUrl.optional(),
  fr: webUrl.optional(),
  es: webUrl.optional(),
  ar: webUrl.optional(),
  "zh-CN": webUrl.optional(),
  sw: webUrl.optional(),
  am: webUrl.optional(),
  ha: webUrl.optional(),
  yo: webUrl.optional(),
  om: webUrl.optional(),
  ti: webUrl.optional(),
  so: webUrl.optional(),
  sid: webUrl.optional(),
  // Legacy property names stay accepted so records created before localization still resolve.
  amharic: webUrl.optional(),
  afaanOromoo: webUrl.optional(),
  english: webUrl.optional(),
  tigrigna: webUrl.optional(),
};

const transcriptLocaleShape = {
  en: z.string().trim().max(20000).optional(),
  fr: z.string().trim().max(20000).optional(),
  es: z.string().trim().max(20000).optional(),
  ar: z.string().trim().max(20000).optional(),
  "zh-CN": z.string().trim().max(20000).optional(),
  sw: z.string().trim().max(20000).optional(),
  am: z.string().trim().max(20000).optional(),
  ha: z.string().trim().max(20000).optional(),
  yo: z.string().trim().max(20000).optional(),
  om: z.string().trim().max(20000).optional(),
  ti: z.string().trim().max(20000).optional(),
  so: z.string().trim().max(20000).optional(),
  sid: z.string().trim().max(20000).optional(),
  amharic: z.string().trim().max(20000).optional(),
  afaanOromoo: z.string().trim().max(20000).optional(),
  english: z.string().trim().max(20000).optional(),
  tigrigna: z.string().trim().max(20000).optional(),
};

function normalizeLegacyLocaleFields<T extends object>(
  source: T,
  legacy: Partial<Record<LocaleCode, keyof T>>,
): Partial<Record<LocaleCode, string>> {
  const fields = source as Record<string, string | undefined>;
  const normalized: Partial<Record<LocaleCode, string>> = {};
  for (const locale of uniqueLocaleCodes) {
    const current = fields[locale];
    const oldKey = legacy[locale];
    const legacyValue = oldKey ? fields[String(oldKey)] : undefined;
    const value = typeof current === "string" && current ? current : legacyValue;
    if (typeof value === "string" && value) normalized[locale] = value;
  }
  return normalized;
}

const legacyAudioFieldNames: Partial<Record<LocaleCode, "amharic" | "afaanOromoo" | "english" | "tigrigna">> = {
  am: "amharic",
  om: "afaanOromoo",
  en: "english",
  ti: "tigrigna",
};

const rawAudioLinksSchema = z.object(audioLocaleLinkShape).strict().refine(
  (links) => Object.values(links).some(Boolean),
  { message: "At least one supported language audio link is required." },
);

const rawTranscriptsSchema = z.object(transcriptLocaleShape).strict();

export const tourismAudioPayloadSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    description: optionalText(5000),
    summary: optionalText(1500),
    audioLinks: rawAudioLinksSchema.transform((links) => normalizeLegacyLocaleFields(links, legacyAudioFieldNames)),
    transcripts: rawTranscriptsSchema
      .transform((transcripts) => normalizeLegacyLocaleFields(transcripts, legacyAudioFieldNames))
      .optional(),
    gps: z
      .object({
        latitude: z.number().finite().min(-90).max(90),
        longitude: z.number().finite().min(-180).max(180),
        altitudeMeters: z.number().finite().optional(),
      })
      .strict(),
    historicalMedia: z.array(mediaItemSchema).max(100).default([]),
    localizedContent: localizedContentSchema,
    branding: brandIdentitySchema.optional(),
  })
  .strict();

export const pdfPayloadSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    description: optionalText(5000),
    fileUrl: webUrl,
    fileName: z.string().trim().min(1).max(255),
    mimeType: z.literal("application/pdf").default("application/pdf"),
    fileSizeBytes: z.number().int().positive().optional(),
    assetId: optionalText(160),
    hostedAssetMetadata: z.record(z.string(), z.string().max(500)).optional(),
    localizedContent: localizedContentSchema,
    branding: brandIdentitySchema.optional(),
  })
  .strict();

export type DestinationPayload =
  | z.infer<typeof landingPagePayloadSchema>
  | z.infer<typeof urlPayloadSchema>
  | z.infer<typeof vCardPayloadSchema>
  | z.infer<typeof menuPayloadSchema>
  | z.infer<typeof tourismAudioPayloadSchema>
  | z.infer<typeof pdfPayloadSchema>
  | z.infer<typeof sectorProfilePayloadSchema>;

export function parseDestinationPayload(
  destinationType: z.infer<typeof destinationTypeSchema>,
  payload: unknown,
): DestinationPayload {
  switch (destinationType) {
    case "LANDING_PAGE":
      return landingPagePayloadSchema.parse(payload);
    case "URL":
      return urlPayloadSchema.parse(payload);
    case "VCARD":
      return vCardPayloadSchema.parse(payload);
    case "MENU":
      return menuPayloadSchema.parse(payload);
    case "TOURISM_AUDIO":
      return tourismAudioPayloadSchema.parse(payload);
    case "PDF":
      return pdfPayloadSchema.parse(payload);
    case "SECTOR_PROFILE":
      return sectorProfilePayloadSchema.parse(payload);
  }
}
