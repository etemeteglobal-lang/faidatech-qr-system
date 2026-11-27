"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { BrandIdentity } from "@/lib/qr/brand";
import type { LocalizedContent } from "@/i18n/localized-content";
import { useI18n } from "@/i18n/LocaleProvider";
import PublicVisitorHeader from "@/components/qr/PublicVisitorHeader";
import GoogleAutoTranslate from "@/components/qr/GoogleAutoTranslate";
import FaidatechSystemMark from "@/components/qr/FaidatechSystemMark";

const PUBLIC_VISITOR_THEME_KEY = "faidatech.public-visitor-theme.v1";
type PublicVisitorTheme = "light" | "dark";

export default function PublicVisitorLayout({
  children,
  title,
  localizedContent,
  branding,
  hidePromotionalFooter = false,
  wide = false,
  showScanEntryMoment = false,
}: {
  children: ReactNode;
  title: string;
  localizedContent?: LocalizedContent;
  branding?: BrandIdentity;
  hidePromotionalFooter?: boolean;
  wide?: boolean;
  showScanEntryMoment?: boolean;
}) {
  const { direction, t } = useI18n();
  const [theme, setTheme] = useState<PublicVisitorTheme>("light");
  const [scanEntryVisible, setScanEntryVisible] = useState(showScanEntryMoment);

  useEffect(() => {
    try {
      const savedTheme = window.localStorage.getItem(PUBLIC_VISITOR_THEME_KEY);
      if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);
    } catch {
      // Continue with the default light appearance when browser storage is unavailable.
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === PUBLIC_VISITOR_THEME_KEY && (event.newValue === "light" || event.newValue === "dark")) {
        setTheme(event.newValue);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    const configuredLogo = branding?.logoUrl?.trim();
    const failedLogoUrls = new WeakMap<HTMLImageElement, string>();
    const updateDrawerLogo = () => {
      const logo = document.querySelector<HTMLImageElement>("#visitor-side-menu > div:first-child img");
      if (!logo) return;
      const useConfiguredLogo = Boolean(configuredLogo && failedLogoUrls.get(logo) !== configuredLogo);
      logo.classList.add("public-drawer-brand-logo");
      logo.classList.toggle("public-drawer-brand-logo--fallback", !useConfiguredLogo);
      logo.alt = useConfiguredLogo ? "Organization logo" : "FaidATech";
      logo.onerror = () => {
        logo.onerror = null;
        if (configuredLogo) failedLogoUrls.set(logo, configuredLogo);
        logo.classList.add("public-drawer-brand-logo--fallback");
        logo.src = "/logo.webp";
        logo.alt = "FaidATech";
      };
      const desiredSrc = useConfiguredLogo ? configuredLogo || "/logo.webp" : "/logo.webp";
      if (logo.getAttribute("src") !== desiredSrc) logo.src = desiredSrc;
    };

    updateDrawerLogo();
    const observer = new MutationObserver(updateDrawerLogo);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [branding?.logoUrl]);

  useEffect(() => {
    document.documentElement.dataset.publicVisitorTheme = theme;
    return () => {
      delete document.documentElement.dataset.publicVisitorTheme;
    };
  }, [theme]);

  useEffect(() => {
    if (!showScanEntryMoment) {
      setScanEntryVisible(false);
      return;
    }

    setScanEntryVisible(true);
    const prefersReducedMotion = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timeout = window.setTimeout(() => setScanEntryVisible(false), prefersReducedMotion ? 1800 : 2200);
    return () => window.clearTimeout(timeout);
  }, [showScanEntryMoment]);

  function toggleTheme() {
    const nextTheme: PublicVisitorTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    try {
      window.localStorage.setItem(PUBLIC_VISITOR_THEME_KEY, nextTheme);
    } catch {
      // The in-memory toggle still works when browser storage is unavailable.
    }
  }

  return (
    <div dir={direction} data-public-theme={theme} className={`public-visitor-theme mx-auto min-h-screen w-full ${wide ? "max-w-6xl" : "max-w-3xl"} px-4 py-5 sm:px-7 sm:py-10`}>
      <GoogleAutoTranslate />
      <PublicVisitorHeader title={title} localizedContent={localizedContent} branding={branding} />
      {showScanEntryMoment && scanEntryVisible ? <div className="pointer-events-none fixed inset-x-0 top-20 z-[80] flex justify-center px-4 sm:top-24">
        <div className={`scan-entry-moment pointer-events-auto flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-xl ${theme === "dark" ? "border-slate-700 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-900"}`}>
          <FaidatechSystemMark size={42} theme={theme} />
          <span role="status" aria-live="polite" className="sr-only">Live profile opened from a dynamic QR code.</span>
          <button type="button" onClick={() => setScanEntryVisible(false)} className={`rounded-lg px-3 py-2 text-xs font-semibold underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${theme === "dark" ? "text-slate-200 focus-visible:outline-cyan-300" : "text-slate-600 focus-visible:outline-blue-600"}`}>
            Skip
          </button>
        </div>
        <style jsx>{`
          .scan-entry-moment { animation: scan-entry-in 220ms ease-out both; }
          @keyframes scan-entry-in {
            from { opacity: 0; transform: translateY(-6px) scale(.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          @media (prefers-reduced-motion: reduce) {
            .scan-entry-moment { animation: none; }
          }
        `}</style>
      </div> : null}
      <div className="public-theme-toggle-row flex justify-end pb-3">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-pressed={theme === "dark"}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="public-theme-toggle grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-base shadow-sm transition hover:-translate-y-px hover:shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
        >
          <span aria-hidden="true">{theme === "dark" ? "☀️" : "🌙"}</span>
        </button>
      </div>
      {children}
      {!hidePromotionalFooter ? <footer translate="no" className="notranslate flex items-center justify-center gap-2 py-5 text-center text-[11px] text-slate-400"><FaidatechSystemMark size={16} theme={theme} />{t("visitor.poweredBy")}</footer> : null}
    </div>
  );
}
