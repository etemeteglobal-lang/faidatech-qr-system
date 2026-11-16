"use client";

import { useI18n } from "./LocaleProvider";
import { catalogReviewStatus } from "./messages";
import { localeMetadata, localeTiers } from "./registry";

export default function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t, direction } = useI18n();
  const status = catalogReviewStatus[locale];
  const statusNotice = status === "fallback_required"
    ? "English is shown while this language catalog awaits translation."
    : status === "machine_draft"
      ? "AI-generated draft; native-speaker review is still required."
      : null;

  return (
    <div className={`min-w-0 ${compact ? "max-w-40" : "max-w-56"}`}>
      <label className="inline-flex w-full min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-faida-navy shadow-sm">
        <span className="sr-only">{t("locale.choose")}</span>
        <span className="shrink-0 text-faida-teal" aria-hidden="true">文</span>
        <select
          aria-label={t("locale.choose")}
          value={locale}
          dir={direction}
          onChange={(event) => setLocale(event.currentTarget.value as typeof locale)}
          className="min-w-0 flex-1 cursor-pointer truncate border-0 bg-transparent py-0.5 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
        >
          {localeTiers.map((tier) => (
            <optgroup key={tier.id} label={t(tier.labelKey)}>
              {tier.locales.map((code) => (
                <option key={`${tier.id}-${code}`} value={code}>{localeMetadata[code].nativeName}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      {statusNotice ? (
        <p lang="en" aria-live="polite" className="mt-1 px-1 text-[10px] leading-4 text-amber-800">
          {statusNotice}
        </p>
      ) : null}
    </div>
  );
}
