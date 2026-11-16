"use client";

import Link from "next/link";
import LanguageSelector from "@/i18n/LanguageSelector";
import { localizedOverride, localizedText, type LocalizedContent } from "@/i18n/localized-content";
import { useI18n } from "@/i18n/LocaleProvider";
import { getReadableTextColor } from "@/lib/qr/brand-presentation";
import type { BrandIdentity } from "@/lib/qr/brand";

export default function PublicVisitorHeader({
  title,
  localizedContent,
  branding,
}: {
  title: string;
  localizedContent?: LocalizedContent;
  branding?: BrandIdentity;
}) {
  const { t, locale } = useI18n();
  const localized = localizedOverride(localizedContent, locale);
  const visitorTitle = localizedText(localized.title, title);
  const brandName = branding?.brandName || "FaidATech";
  const accent = branding?.accentColor || "#10B981";
  const accentText = getReadableTextColor(accent);

  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
      <Link href="/" aria-label={`${brandName} ${t("shell.publicHome")}`} className="flex min-w-0 items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl text-xs font-black" style={{ backgroundColor: accent, color: accentText }}>
          {branding?.logoUrl ? <img src={branding.logoUrl} alt={t("branding.logoPreview")} className="h-full w-full bg-white object-contain p-1" /> : "F"}
        </span>
        <span className="min-w-0"><strong className="block truncate text-xs font-extrabold text-faida-navy">{brandName}</strong><span className="mt-0.5 block truncate text-[10px] text-faida-slate">{visitorTitle}</span></span>
      </Link>
      <LanguageSelector compact />
    </header>
  );
}
