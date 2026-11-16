import { z } from "zod";
import { brandIdentitySchema } from "@/lib/qr/brand";
import { isLocaleCode, uniqueLocaleCodes, type LocaleCode } from "@/i18n/registry";

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
]);

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
  | z.infer<typeof pdfPayloadSchema>;

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
  }
}
