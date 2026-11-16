"use client";

import { useState } from "react";
import type { z } from "zod";
import type { menuPayloadSchema } from "@/lib/qr/payload-schemas";
import { localeMetadata } from "@/i18n/registry";
import { localizedField, localizedOverride, localizedText } from "@/i18n/localized-content";
import { useI18n } from "@/i18n/LocaleProvider";
import { getReadableTextColor } from "@/lib/qr/brand-presentation";

type MenuPayload = z.infer<typeof menuPayloadSchema>;

function formatPrice(value: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: "ETB", maximumFractionDigits: 2 }).format(value);
  } catch {
    return `ETB ${value.toFixed(2)}`;
  }
}

export default function InteractiveMenu({ payload }: { payload: MenuPayload }) {
  const { locale, t } = useI18n();
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const categories = payload.categories;
  const active = categories[activeCategoryIndex] ?? categories[0];
  const accent = payload.branding?.accentColor ?? "#10B981";
  const accentText = getReadableTextColor(accent);
  const copy = localizedOverride(payload.localizedContent, locale);
  const displayName = localizedText(copy.title, localizedText(copy.displayName, payload.displayName));
  const description = localizedText(copy.description, payload.description ?? "");
  const numberLocale = localeMetadata[locale].formattingLocale;

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] bg-faida-navy p-6 text-white shadow-soft sm:p-7">
        <div className="flex items-center gap-3">
          {payload.branding?.logoUrl ? <img src={payload.branding.logoUrl} alt={`${payload.branding.brandName || t("visitor.organization")} ${t("branding.logoPreview")}`} className="h-10 w-10 rounded-xl bg-white object-contain p-1" /> : null}
          <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: accent }}>{payload.branding?.brandName || t("visitor.todayMenu")}</p>
            <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{displayName}</h1>
            {description ? <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">{description}</p> : null}
          </div>
        </div>
        {payload.telebirrCheckout ? <a href={payload.telebirrCheckout.checkoutUrl || undefined} aria-disabled={!payload.telebirrCheckout.checkoutUrl} className={`mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ${payload.telebirrCheckout.checkoutUrl ? "hover:opacity-90" : "cursor-not-allowed bg-white/10 text-slate-300"}`} style={payload.telebirrCheckout.checkoutUrl ? { backgroundColor: accent, color: accentText } : undefined}>
          {t("visitor.payWithTelebirr")}<span className="rounded-md bg-white/15 px-2 py-0.5 text-[10px]">{payload.telebirrCheckout.merchantName}</span>
        </a> : null}
      </section>

      <div className="flex gap-2 overflow-x-auto pb-1" aria-label={t("visitor.menuCategories")}>
        {categories.map((category, index) => {
          const categoryName = localizedField(copy, `menu.categories[${index}].name`, category.name) ?? category.name;
          return <button type="button" key={`${category.name}-${index}`} onClick={() => setActiveCategoryIndex(index)} aria-pressed={activeCategoryIndex === index} className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition ${activeCategoryIndex === index ? "shadow-sm" : "border border-slate-200 bg-white text-faida-slate hover:border-emerald-200"}`} style={activeCategoryIndex === index ? { backgroundColor: accent, color: accentText } : undefined}>{categoryName}</button>;
        })}
      </div>

      {active ? <section aria-live="polite">
        {localizedField(copy, `menu.categories[${activeCategoryIndex}].description`, active.description) ? <p className="mb-3 text-sm text-faida-slate">{localizedField(copy, `menu.categories[${activeCategoryIndex}].description`, active.description)}</p> : null}
        <div className="space-y-3">
          {active.items.map((item, index) => {
            const path = `menu.categories[${activeCategoryIndex}].items[${index}]`;
            const itemName = localizedField(copy, `${path}.name`, item.name) ?? item.name;
            const itemDescription = localizedField(copy, `${path}.description`, item.description);
            return <article key={`${item.name}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div><h2 className="font-semibold text-faida-navy">{itemName}</h2>
                  {itemDescription ? <p className="mt-1.5 text-sm leading-6 text-faida-slate">{itemDescription}</p> : null}
                  {!item.isAvailable ? <span className="mt-3 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">{t("common.unavailable")}</span> : null}
                </div>
                <span className="shrink-0 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold tabular-nums" style={{ color: accent }}>{formatPrice(item.priceETB, numberLocale)}</span>
              </div>
            </article>;
          })}
        </div>
      </section> : null}
    </div>
  );
}
