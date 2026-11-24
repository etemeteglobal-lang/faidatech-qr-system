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

export function localizedOverride(content: LocalizedContent | undefined, locale: LocaleCode): LocalizedTextOverride {
  const english = content?.en ?? {};
  if (locale === "en") return english;
  const selected = content?.[locale] ?? {};
  return {
    ...english,
    ...selected,
    fields: { ...english.fields, ...selected.fields },
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

export function localizedText(candidate: string | undefined, fallback: string): string {
  return candidate?.trim() ? candidate : fallback;
}
