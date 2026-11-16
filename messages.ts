import english from "./catalogs/en.json";
import french from "./catalogs/fr.json";
import spanish from "./catalogs/es.json";
import arabic from "./catalogs/ar.json";
import simplifiedChinese from "./catalogs/zh-CN.json";
import swahili from "./catalogs/sw.json";
import amharic from "./catalogs/am.json";
import hausa from "./catalogs/ha.json";
import yoruba from "./catalogs/yo.json";
import oromo from "./catalogs/om.json";
import tigrinya from "./catalogs/ti.json";
import somali from "./catalogs/so.json";
import sidama from "./catalogs/sid.json";
import type { LocaleCode } from "./registry";

export type MessageKey = keyof typeof english.messages;
export type MessageCatalog = Record<MessageKey, string>;

// Fallback-required JSON files intentionally contain English source text until
// they can be translated and reviewed. Keep this derived from catalog metadata.
export const catalogReviewStatus: Record<LocaleCode, string> = {
  en: english.meta.reviewStatus,
  fr: french.meta.reviewStatus,
  es: spanish.meta.reviewStatus,
  ar: arabic.meta.reviewStatus,
  "zh-CN": simplifiedChinese.meta.reviewStatus,
  sw: swahili.meta.reviewStatus,
  am: amharic.meta.reviewStatus,
  ha: hausa.meta.reviewStatus,
  yo: yoruba.meta.reviewStatus,
  om: oromo.meta.reviewStatus,
  ti: tigrinya.meta.reviewStatus,
  so: somali.meta.reviewStatus,
  sid: sidama.meta.reviewStatus,
};

export const catalogs: Record<LocaleCode, MessageCatalog> = {
  en: english.messages,
  fr: french.messages,
  es: spanish.messages,
  ar: arabic.messages,
  "zh-CN": simplifiedChinese.messages,
  sw: swahili.messages,
  am: amharic.messages,
  ha: hausa.messages,
  yo: yoruba.messages,
  om: oromo.messages,
  ti: tigrinya.messages,
  so: somali.messages,
  sid: sidama.messages,
};
