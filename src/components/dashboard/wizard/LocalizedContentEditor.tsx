"use client";

import { useState } from "react";
import type { WizardForm } from "@/components/dashboard/wizard/model";
import type { LocaleCode } from "@/i18n/registry";
import { localeMetadata, uniqueLocaleCodes } from "@/i18n/registry";
import { useI18n } from "@/i18n/LocaleProvider";

export default function LocalizedContentEditor({
  form,
  setFormAction,
}: {
  form: WizardForm;
  setFormAction: (next: WizardForm) => void;
}) {
  const { t } = useI18n();
  const [selectedLocale, setSelectedLocale] = useState<LocaleCode>("fr");
  const override = form.localizedContent[selectedLocale] ?? {};

  function update(field: "title" | "description" | "summary" | "body" | "buttonLabel" | "displayName", value: string) {
    setFormAction({
      ...form,
      localizedContent: {
        ...form.localizedContent,
        [selectedLocale]: { ...override, [field]: value },
      },
    });
  }

  function removeLocale() {
    const next = { ...form.localizedContent };
    delete next[selectedLocale];
    setFormAction({ ...form, localizedContent: next });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" aria-labelledby="localized-content-title">
      <div className="border-b border-slate-100 pb-3">
        <h3 id="localized-content-title" className="text-base font-semibold text-faida-navy">{t("localizedContent.heading")}</h3>
        <p className="mt-1 text-xs leading-5 text-faida-slate">{t("localizedContent.note")}</p>
      </div>
      <label className="mt-4 block max-w-sm text-sm font-semibold text-slate-700">
        <span>{t("localizedContent.locale")}</span>
        <select
          value={selectedLocale}
          onChange={(event) => setSelectedLocale(event.target.value as LocaleCode)}
          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal text-faida-navy outline-none focus:border-faida-teal focus:ring-4 focus:ring-teal-50"
        >
          {uniqueLocaleCodes.filter((locale) => locale !== "en").map((locale) => (
            <option key={locale} value={locale}>{localeMetadata[locale].nativeName} ({locale})</option>
          ))}
        </select>
      </label>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">
          <span>{t("localizedContent.title")}</span>
          <input lang={selectedLocale} dir={localeMetadata[selectedLocale].direction} value={override.title ?? ""} onChange={(event) => update("title", event.target.value)} maxLength={160} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal text-faida-navy outline-none focus:border-faida-teal focus:ring-4 focus:ring-teal-50" />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          <span>{t("localizedContent.displayName")}</span>
          <input lang={selectedLocale} dir={localeMetadata[selectedLocale].direction} value={override.displayName ?? ""} onChange={(event) => update("displayName", event.target.value)} maxLength={160} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal text-faida-navy outline-none focus:border-faida-teal focus:ring-4 focus:ring-teal-50" />
        </label>
        <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
          <span>{t("localizedContent.description")}</span>
          <textarea lang={selectedLocale} dir={localeMetadata[selectedLocale].direction} value={override.description ?? ""} onChange={(event) => update("description", event.target.value)} maxLength={5000} rows={2} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal leading-6 text-faida-navy outline-none focus:border-faida-teal focus:ring-4 focus:ring-teal-50" />
        </label>
        <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
          <span>{t("localizedContent.summary")}</span>
          <textarea lang={selectedLocale} dir={localeMetadata[selectedLocale].direction} value={override.summary ?? ""} onChange={(event) => update("summary", event.target.value)} maxLength={1500} rows={2} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal leading-6 text-faida-navy outline-none focus:border-faida-teal focus:ring-4 focus:ring-teal-50" />
        </label>
        <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
          <span>{t("localizedContent.body")}</span>
          <textarea lang={selectedLocale} dir={localeMetadata[selectedLocale].direction} value={override.body ?? ""} onChange={(event) => update("body", event.target.value)} maxLength={10000} rows={4} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal leading-6 text-faida-navy outline-none focus:border-faida-teal focus:ring-4 focus:ring-teal-50" />
        </label>
        <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
          <span>{t("localizedContent.buttonLabel")}</span>
          <input lang={selectedLocale} dir={localeMetadata[selectedLocale].direction} value={override.buttonLabel ?? ""} onChange={(event) => update("buttonLabel", event.target.value)} maxLength={60} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal text-faida-navy outline-none focus:border-faida-teal focus:ring-4 focus:ring-teal-50" />
        </label>
      </div>
      <p className="mt-3 text-xs leading-5 text-faida-slate">{t("localizedContent.fieldPathsNote")}</p>
      {form.localizedContent[selectedLocale] ? (
        <button type="button" onClick={removeLocale} className="mt-3 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-500 transition hover:bg-rose-50 hover:text-rose-700">{t("localizedContent.removeLocale")}</button>
      ) : null}
    </section>
  );
}
