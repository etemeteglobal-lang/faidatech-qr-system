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
}: {
  children: ReactNode;
  title: string;
  localizedContent?: LocalizedContent;
  branding?: BrandIdentity;
  hidePromotionalFooter?: boolean;
  wide?: boolean;
}) {
  const { direction, t } = useI18n();
  const [theme, setTheme] = useState<PublicVisitorTheme>("light");

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
