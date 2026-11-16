import { localeMetadata, type LocaleCode } from "./registry";

export function formatNumber(value: number, locale: LocaleCode): string {
  return new Intl.NumberFormat(localeMetadata[locale].formattingLocale, { maximumFractionDigits: 0 }).format(value);
}

export function formatETB(value: number, locale: LocaleCode): string {
  try {
    return new Intl.NumberFormat(localeMetadata[locale].formattingLocale, {
      style: "currency",
      currency: "ETB",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `ETB ${value.toFixed(2)}`;
  }
}
