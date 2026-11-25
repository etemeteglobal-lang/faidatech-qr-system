"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import LanguageSelector from "@/i18n/LanguageSelector";
import { localizedOverride, localizedText, type LocalizedContent } from "@/i18n/localized-content";
import { useI18n } from "@/i18n/LocaleProvider";
import { getReadableTextColor } from "@/lib/qr/brand-presentation";
import type { BrandIdentity } from "@/lib/qr/brand";

export default function PublicVisitorHeader({ title, localizedContent, branding }: { title: string; localizedContent?: LocalizedContent; branding?: BrandIdentity }) {
  const { t, locale } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sections, setSections] = useState<{ id: string; label: string }[]>([]);
  const [activeSection, setActiveSection] = useState("");
  const supportPhone = process.env.NEXT_PUBLIC_FAIDATECH_PHONE?.trim() || "+251975498916";
  const localized = localizedOverride(localizedContent, locale);
  const visitorTitle = localizedText(localized.title, title);
  const brandName = branding?.brandName || "FaidATech";
  const accent = branding?.accentColor || "#10B981";
  const accentText = getReadableTextColor(accent);

  useEffect(() => {
    const refresh = () => {
      const found = Array.from(document.querySelectorAll<HTMLElement>("[data-visitor-section][id]"))
        .map((element) => ({ id: element.id, label: element.dataset.visitorLabel?.trim() || element.querySelector("h2")?.textContent?.trim() || element.id }))
        .filter((section) => section.label);
      setSections(found);
      if (found.length && !found.some((section) => section.id === activeSection)) setActiveSection(found[0].id);
    };
    const frame = window.requestAnimationFrame(refresh);
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true });
    const scroll = () => {
      const active = Array.from(document.querySelectorAll<HTMLElement>("[data-visitor-section][id]"))
        .filter((element) => element.getBoundingClientRect().top <= 180)
        .at(-1);
      if (active) setActiveSection(active.id);
    };
    window.addEventListener("scroll", scroll, { passive: true });
    return () => { window.cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("scroll", scroll); };
  }, [activeSection]);

  return <header className="sticky top-0 z-30 mb-6 flex w-full flex-nowrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2.5 shadow-sm backdrop-blur sm:gap-3 sm:p-3">
    <button type="button" aria-expanded={menuOpen} aria-controls="visitor-side-menu" aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen((open) => !open)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 text-2xl leading-none text-faida-navy" aria-haspopup="dialog"><span aria-hidden="true">☰</span></button>
    <div className="ml-auto flex min-w-0 items-center gap-2">
      <Link href="/" aria-label={`${brandName} ${t("shell.publicHome")}`} className="flex min-w-0 shrink items-center gap-2 text-right">
        <span className="min-w-0"><strong translate="no" className="notranslate block truncate text-xs font-extrabold text-faida-navy">{brandName}</strong><span className="mt-0.5 block truncate text-[10px] text-faida-slate">{visitorTitle}</span></span>
        <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl sm:h-14 sm:w-14" style={{ backgroundColor: accent, color: accentText }}>
          {branding?.logoUrl ? <img src={branding.logoUrl} alt={t("branding.logoPreview")} className="h-full w-full bg-white object-contain p-1" /> : <img src="/logo.png" alt="FaidATech" className="h-full w-full bg-white object-contain p-1" />}
        </span>
      </Link>
      <LanguageSelector compact autoTranslate />
    </div>
    {menuOpen && typeof document !== "undefined" ? createPortal(<>
      <style jsx global>{`@keyframes visitor-drawer-in { from { transform: translateX(-100%); } to { transform: translateX(0); } } @keyframes visitor-backdrop-in { from { opacity: 0; } to { opacity: 1; } } @media (prefers-reduced-motion: reduce) { .visitor-drawer-motion, .visitor-backdrop-motion { animation-duration: 1ms !important; } }`}</style>
      <button
        type="button"
        aria-label="Close menu"
        onClick={() => setMenuOpen(false)}
        className="visitor-backdrop-motion fixed inset-0 h-dvh w-screen z-40 cursor-default bg-slate-950/30"
        style={{ animation: "visitor-backdrop-in 180ms ease-out both" }}
      />
      <aside
        id="visitor-side-menu"
        role="dialog"
        aria-modal="true"
        aria-label="FaidATech menu"
        className="visitor-drawer-motion fixed inset-y-0 left-0 z-50 flex h-dvh w-1/2 max-w-[50vw] flex-col border-r border-slate-200 bg-white p-3 shadow-2xl sm:p-5"
        style={{ animation: "visitor-drawer-in 220ms ease-out both" }}
      >
        <div className="flex shrink-0 items-center justify-between gap-2">
          <Link href="/" onClick={() => setMenuOpen(false)} className="flex min-w-0 items-center gap-2">
            <img src="/logo.png" alt="FaidATech" className="h-11 w-24 shrink-0 rounded-lg bg-white object-contain p-1" />
          </Link>
          <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu" className="shrink-0 rounded-lg px-2 py-1 text-2xl leading-none text-faida-navy">×</button>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <p className="break-words text-xs text-slate-600">{visitorTitle}</p>
          <div className="mt-3"><LanguageSelector compact autoTranslate /></div>
          {sections.length ? <nav aria-label="On this page" className="mt-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">On this page</p>
            <ul className="space-y-1">
              {sections.map((section) => <li key={section.id}>
                <button
                  type="button"
                  aria-current={activeSection === section.id ? "location" : undefined}
                  onClick={() => {
                    document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                    setActiveSection(section.id);
                    setMenuOpen(false);
                  }}
                  className={`w-full rounded-lg px-2 py-2 text-left text-xs font-semibold ${activeSection === section.id ? "bg-emerald-50 text-emerald-900" : "text-slate-700 hover:bg-slate-50"}`}
                >{section.label}</button>
              </li>)}
            </ul>
          </nav> : null}
        </div>

        <footer className="mt-3 shrink-0 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="FaidATech" className="h-11 w-24 shrink-0 rounded-lg bg-white object-contain p-1" />
          </div>
          <p className="mt-2 break-words text-[10px] leading-4 text-slate-700">
            Phone support: {supportPhone
              ? <a className="font-semibold underline" href={`tel:${supportPhone.replace(/[^+0-9]/g, "")}`}>{supportPhone}</a>
              : <a className="font-semibold underline" href="https://faidatech.pro.et">faidatech.pro.et</a>}
          </p>
          <a href="https://faidatech.pro.et" className="mt-1 inline-block text-[10px] font-semibold text-emerald-900 underline">faidatech.pro.et</a>
          <Link href="/" onClick={() => setMenuOpen(false)} className="mt-2 block rounded-lg bg-emerald-700 px-2 py-2 text-center text-[10px] font-bold text-white">Create your own QR</Link>
        </footer>
      </aside>
    </>, document.body) : null}
  </header>;
}
