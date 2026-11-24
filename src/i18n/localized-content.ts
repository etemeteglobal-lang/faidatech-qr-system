import type { LocaleCode } from "./registry";

export type LocalizedTextOverride = {
  title?: string;
  description?: string;
  summary?: string;
  body?: string;
  buttonLabel?: string;
  displayName?: string;
  fields?: Record<string, string>;
};

export type LocalizedContent = Partial<Record<LocaleCode, LocalizedTextOverride>>;

function asContent(content: LocalizedContent | string | undefined): LocalizedContent {
  if (!content) return {};
  if (typeof content !== "string") return content;
  try {
    const parsed: unknown = JSON.parse(content);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as LocalizedContent : {};
  } catch {
    return { en: { title: content } };
  }
}

export function localizedOverride(content: LocalizedContent | string | undefined, locale: LocaleCode): LocalizedTextOverride {
  const normalized = asContent(content);
  const english = normalized.en ?? {};
  const selected = normalized[locale] ?? {};
  const first = Object.values(normalized).find((value) => value && typeof value === "object") ?? {};
  return {
    ...first,
    ...english,
    ...selected,
    fields: { ...first.fields, ...english.fields, ...selected.fields },
  };
}

export function localizedField(
  content: LocalizedTextOverride,
  key: string,
  fallback: string | undefined,
): string | undefined {
  const candidate = content.fields?.[key];
  return candidate?.trim() ? candidate : fallback;
}

export function localizedText(candidate: unknown, fallback: string): string {
  if (typeof candidate === "string" && candidate.trim()) return candidate;
  if (typeof candidate === "number" || typeof candidate === "boolean") return String(candidate);
  return fallback;
}
