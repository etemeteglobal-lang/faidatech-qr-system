"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { localeMetadata, resolveLocaleCode, type LocaleCode } from "./registry";
import { catalogReviewStatus, catalogs, type MessageKey } from "./messages";

export type TranslationValues = Record<string, string | number>;
export type Translate = (key: MessageKey, values?: TranslationValues) => string;

type LocaleContextValue = {
  locale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
  direction: "ltr" | "rtl";
  t: Translate;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);
const STORAGE_KEY = "faidatech.locale";

function interpolate(template: string, values?: TranslationValues): string {
  if (!values) return template;
  return template.replace(/\{([A-Za-z0-9_.-]+)\}/g, (match, name: string) => {
    const value = values[name];
    return value === undefined || value === null ? match : String(value);
  });
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<LocaleCode>("en");
  const englishFallback = catalogReviewStatus[locale] === "fallback_required";

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // Storage can be disabled; browser language and the in-memory selection still work.
    }
    const preferred = resolveLocaleCode(saved) ?? resolveLocaleCode(window.navigator.language) ?? "en";
    setLocale(preferred);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    // Do not announce English fallback strings as Amharic, Oromo, Yoruba,
    // Tigrinya, Somali, or Sidama to screen readers.
    root.lang = englishFallback ? "en" : locale;
    root.dir = localeMetadata[locale].direction;
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // Persisting preference is best-effort; switching remains available for this page view.
    }
  }, [englishFallback, locale]);

  const t = useCallback<Translate>((key, values) => {
    const activeCatalog = englishFallback ? catalogs.en : catalogs[locale];
    const template = activeCatalog?.[key] ?? catalogs.en?.[key] ?? key;
    return interpolate(template, values);
  }, [englishFallback, locale]);

  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    setLocale,
    direction: localeMetadata[locale].direction,
    t,
  }), [locale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useI18n(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useI18n must be used inside LocaleProvider.");
  return value;
}
