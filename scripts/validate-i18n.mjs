import { readdir, readFile } from "node:fs/promises";

const directory = new URL("../src/i18n/catalogs/", import.meta.url);
const source = JSON.parse(await readFile(new URL("en.json", directory), "utf8"));
const sourceKeys = Object.keys(source.messages).sort();
const phase2Keys = sourceKeys.filter((key) => /^(nav\.(templates|agents|ecosystem)|templates\.|agents\.|ecosystem\.|shared\.|pillar\.|wizard\.pillar)/.test(key));
const tierMemberships = {
  en: ["global"], fr: ["global"], es: ["global"], ar: ["global"], "zh-CN": ["global"],
  sw: ["african"], am: ["african", "ethiopian"], ha: ["african"], yo: ["african"],
  om: ["african", "ethiopian"], ti: ["ethiopian"], so: ["ethiopian"], sid: ["ethiopian"],
};
const locales = Object.keys(tierMemberships);
const directionFor = (locale) => locale === "ar" ? "rtl" : "ltr";
const files = new Set((await readdir(directory)).filter((name) => name.endsWith(".json")));
const errors = [];
const counts = { machine_draft: 0, fallback_required: 0, native_reviewed: 0 };

for (const locale of locales) {
  const filename = `${locale}.json`;
  if (!files.has(filename)) {
    errors.push(`${filename}: missing catalog`);
    continue;
  }

  let catalog;
  try {
    catalog = JSON.parse(await readFile(new URL(filename, directory), "utf8"));
  } catch {
    errors.push(`${filename}: invalid JSON`);
    continue;
  }

  const meta = catalog.meta ?? {};
  if (meta.code !== locale) errors.push(`${filename}: meta.code must be ${locale}`);
  if (meta.direction !== directionFor(locale)) errors.push(`${filename}: incorrect text direction`);
  if (meta.sourceLocale !== "en") errors.push(`${filename}: meta.sourceLocale must be en`);
  if (JSON.stringify(meta.tierMemberships) !== JSON.stringify(tierMemberships[locale])) {
    errors.push(`${filename}: tierMemberships do not match the supported placements`);
  }
  if (locale === "en") {
    if (meta.reviewStatus !== "source" || meta.translationStatus !== "source") {
      errors.push(`${filename}: English must be marked as the authoritative source`);
    }
  } else {
    const status = meta.reviewStatus;
    if (!["machine_draft", "fallback_required", "native_reviewed"].includes(status)) {
      errors.push(`${filename}: reviewStatus must explicitly identify draft, fallback, or native review`);
    } else {
      counts[status] += 1;
    }
    if (meta.translationStatus !== status) errors.push(`${filename}: translationStatus must match reviewStatus`);
    if (status === "machine_draft" && meta.nativeReviewRequired !== true) {
      errors.push(`${filename}: machine drafts must require native review`);
    }
    if (status === "fallback_required" && (meta.fallbackLocale !== "en" || meta.nativeReviewRequired !== true)) {
      errors.push(`${filename}: English fallback and native-review requirement must be explicit`);
    }
  }

  const messages = catalog.messages ?? {};
  const declaredPhase2Fallbacks = Array.isArray(meta.phase2FallbackKeys) ? [...meta.phase2FallbackKeys].sort() : [];
  if (locale === "en" && declaredPhase2Fallbacks.length) errors.push(`${filename}: English source must not list Phase 2 fallback keys`);
  if (locale !== "en") {
    const phase2KeySet = new Set(phase2Keys);
    const invalidFallbacks = declaredPhase2Fallbacks.filter((key) => !phase2KeySet.has(key));
    if (invalidFallbacks.length) errors.push(`${filename}: phase2FallbackKeys contains non-Phase 2 keys (${invalidFallbacks.slice(0, 5).join(", ")})`);
    const actualFallbacks = phase2Keys.filter((key) => messages[key] === source.messages[key]);
    if (JSON.stringify(declaredPhase2Fallbacks) !== JSON.stringify(actualFallbacks)) {
      errors.push(`${filename}: phase2FallbackKeys must exactly list Phase 2 messages still identical to English`);
    }
    for (const key of declaredPhase2Fallbacks) {
      if (messages[key] !== source.messages[key]) errors.push(`${filename}: ${key} must match English while declared as a fallback`);
    }
  }
  const messageKeys = Object.keys(messages).sort();
  const missing = sourceKeys.filter((key) => !Object.hasOwn(messages, key));
  const extra = messageKeys.filter((key) => !Object.hasOwn(source.messages, key));
  if (missing.length) errors.push(`${filename}: missing ${missing.length} source keys (${missing.slice(0, 5).join(", ")})`);
  if (extra.length) errors.push(`${filename}: extra ${extra.length} keys (${extra.slice(0, 5).join(", ")})`);

  for (const key of sourceKeys) {
    const value = messages[key];
    if (typeof value !== "string" || !value.trim()) {
      errors.push(`${filename}: ${key} must be a non-empty string`);
      continue;
    }
    if (meta.reviewStatus === "fallback_required" && value !== source.messages[key]) {
      errors.push(`${filename}: ${key} must exactly match English while reviewStatus is fallback_required`);
    }
    const tokens = (text) => [...text.matchAll(/\{([A-Za-z0-9_.-]+)\}/g)].map((match) => match[1]).sort();
    if (JSON.stringify(tokens(value)) !== JSON.stringify(tokens(source.messages[key]))) {
      errors.push(`${filename}: interpolation token mismatch for ${key}`);
    }
  }
}

const extraFiles = [...files].filter((filename) => !locales.some((locale) => filename === `${locale}.json`));
if (extraFiles.length) errors.push(`Unregistered catalog files: ${extraFiles.join(", ")}`);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Localization catalogs valid: ${locales.length} locales, ${sourceKeys.length} keys; ${counts.machine_draft} machine drafts, ${counts.fallback_required} English fallbacks, ${counts.native_reviewed} native-reviewed.`);
}
