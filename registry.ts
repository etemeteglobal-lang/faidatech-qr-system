export const uniqueLocaleCodes = [
  "en", "fr", "es", "ar", "zh-CN", "sw", "am", "ha", "yo", "om", "ti", "so", "sid",
] as const;

export type LocaleCode = (typeof uniqueLocaleCodes)[number];
export type LocaleTierId = "global" | "african" | "ethiopian";

export type LocaleMetadata = {
  nativeName: string;
  formattingLocale: string;
  direction: "ltr" | "rtl";
};

export const localeMetadata: Record<LocaleCode, LocaleMetadata> = {
  en: { nativeName: "English", formattingLocale: "en-ET", direction: "ltr" },
  fr: { nativeName: "Français", formattingLocale: "fr-FR", direction: "ltr" },
  es: { nativeName: "Español", formattingLocale: "es-ES", direction: "ltr" },
  ar: { nativeName: "العربية", formattingLocale: "ar", direction: "rtl" },
  "zh-CN": { nativeName: "中文（简体）", formattingLocale: "zh-CN", direction: "ltr" },
  sw: { nativeName: "Kiswahili", formattingLocale: "sw-KE", direction: "ltr" },
  am: { nativeName: "አማርኛ", formattingLocale: "am-ET", direction: "ltr" },
  ha: { nativeName: "Hausa", formattingLocale: "ha-NE", direction: "ltr" },
  yo: { nativeName: "Yorùbá", formattingLocale: "yo-NG", direction: "ltr" },
  om: { nativeName: "Afaan Oromoo", formattingLocale: "om-ET", direction: "ltr" },
  ti: { nativeName: "ትግርኛ", formattingLocale: "ti-ET", direction: "ltr" },
  so: { nativeName: "Soomaali", formattingLocale: "so-SO", direction: "ltr" },
  sid: { nativeName: "Sidaamu Afoo", formattingLocale: "sid-ET", direction: "ltr" },
};

export const localeTiers: {
  id: LocaleTierId;
  labelKey: "locale.globalTier" | "locale.africanTier" | "locale.ethiopianTier";
  locales: readonly LocaleCode[];
}[] = [
  { id: "global", labelKey: "locale.globalTier", locales: ["en", "fr", "es", "ar", "zh-CN"] },
  { id: "african", labelKey: "locale.africanTier", locales: ["sw", "am", "ha", "yo", "om"] },
  { id: "ethiopian", labelKey: "locale.ethiopianTier", locales: ["am", "om", "ti", "so", "sid"] },
];

export const localePlacementCount = localeTiers.reduce((total, tier) => total + tier.locales.length, 0);

export function isLocaleCode(value: string): value is LocaleCode {
  return (uniqueLocaleCodes as readonly string[]).includes(value);
}

export function resolveLocaleCode(value: string | null | undefined): LocaleCode | null {
  if (!value) return null;
  const normalized = value.trim().replaceAll("_", "-");
  if (isLocaleCode(normalized)) return normalized;
  const lower = normalized.toLowerCase();
  if (lower === "zh" || lower.startsWith("zh-") || lower === "cmn") return "zh-CN";
  const base = lower.split("-")[0];
  return isLocaleCode(base) ? base : null;
}
