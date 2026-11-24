"use client";

import Link from "next/link";
import LanguageSelector from "@/i18n/LanguageSelector";
import { localizedOverride, localizedText, type LocalizedContent } from "@/i18n/localized-content";
import { useState } from "react";
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
  const [open, setOpen] = useState(false);
  const sections = [
    ["about", t("profile.aboutTitle")],
    ["spotlight", t("profile.featured")],
    ["contact", t("profile.contactTitle")],
    ["socials", t("profile.socialTitle")],
    ["showcase", t("profile.showcaseTitle")],
    ["credentials", t("profile.credentialsTitle")],
    ["reviews", t("profile.reviewsTitle")],
  ] as const;

  return (
    <header className="relative z-30 mb-6 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
      <Link href="/" aria-label={`${brandName} ${t("shell.publicHome")}`} className="flex min-w-0 flex-1 items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl text-xs font-black" style={{ backgroundColor: accent, color: accentText }}>
          {branding?.logoUrl ? <img src={branding.logoUrl} alt={t("branding.logoPreview")} className="h-full w-full bg-white object-contain p-1" /> : "F"}
        </span>
        <span className="min-w-0"><strong className="block truncate text-xs font-extrabold text-faida-navy">{brandName}</strong><span className="mt-0.5 block truncate text-[10px] text-faida-slate">{visitorTitle}</span></span>
      </Link>
      <div className="ms-auto flex shrink-0 items-center gap-2"><LanguageSelector compact /><button type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="public-section-drawer" className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-lg text-faida-navy hover:bg-slate-50" aria-label={t("profile.openNavigation")}>☰</button></div>
      {open ? <div className="fixed inset-0 z-40 bg-slate-950/30" role="presentation" onClick={() => setOpen(false)}><aside id="public-section-drawer" role="dialog" aria-modal="true" aria-label={t("profile.sectionNavigation")} onClick={(event) => event.stopPropagation()} className="ms-auto flex h-full w-[min(88vw,22rem)] flex-col bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-lg font-bold text-faida-navy">{t("profile.sectionNavigation")}</h2><button type="button" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-xl" aria-label={t("profile.closeNavigation")}>×</button></div><nav className="mt-5 space-y-1">{sections.map(([id, label]) => <a key={id} href={`#${id}`} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-900">{label}</a>)}</nav><div className="mt-auto rounded-2xl bg-faida-navy p-4 text-white"><p className="text-xs font-bold uppercase tracking-[.16em] text-faida-green">FaidATech</p><p className="mt-2 text-sm leading-6 text-slate-200">{t("profile.promoCard")}</p><Link href="/" onClick={() => setOpen(false)} className="mt-3 inline-flex text-xs font-bold text-faida-green underline underline-offset-4">{t("shell.publicHome")}</Link></div></aside></div> : null}
    </header>
  );
}
