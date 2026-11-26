"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import LanguageSelector from "@/i18n/LanguageSelector";
import { useI18n } from "@/i18n/LocaleProvider";
import type { MessageKey } from "@/i18n/messages";
import { applyThemePreference, readDashboardPreferences } from "@/lib/dashboard-preferences";

type Session = {
  user: { id: string; name: string | null; email: string | null; role: string };
  organization: { id: string; name: string; slug: string };
};

type ApiEnvelope<T> = { data?: T; error?: { code?: string; message?: string } };
type Crumb = { labelKey: MessageKey; href?: string };

const navigation = [
  { labelKey: "nav.dashboard", href: "/dashboard", mark: "D" },
  { labelKey: "nav.qrcodes", href: "/dashboard/qrcodes", mark: "Q" },
  { labelKey: "nav.analytics", href: "/dashboard/analytics", mark: "A" },
  { labelKey: "nav.campaigns", href: "/dashboard/campaigns", mark: "C" },
  { labelKey: "nav.integrations", href: "/dashboard/integrations", mark: "I" },
  { labelKey: "nav.billing", href: "/dashboard/billing", mark: "B" },
  { labelKey: "nav.settings", href: "/dashboard/settings", mark: "S" },
] as const;

const routeLabels: Record<string, MessageKey> = {
  "/dashboard": "nav.dashboard",
  "/dashboard/qrcodes": "nav.qrcodes",
  "/dashboard/analytics": "nav.analytics",
  "/dashboard/campaigns": "nav.campaigns",
  "/dashboard/integrations": "nav.integrations",
  "/dashboard/billing": "nav.billing",
  "/dashboard/settings": "nav.settings",
  "/dashboard/create": "wizard.createHeader",
};

function getBackTarget(pathname: string): { href: string; labelKey: MessageKey } {
  if (pathname === "/dashboard") return { href: "/", labelKey: "shell.publicHome" };
  if (pathname === "/dashboard/create") return { href: "/dashboard/qrcodes", labelKey: "shell.qrLibrary" };
  return { href: "/dashboard", labelKey: "nav.dashboard" };
}

function getBreadcrumbs(pathname: string): Crumb[] {
  const current = routeLabels[pathname] ?? "nav.dashboard";
  const crumbs: Crumb[] = [{ labelKey: "common.home", href: "/" }, { labelKey: "nav.dashboard", href: "/dashboard" }];
  if (pathname !== "/dashboard") crumbs.push({ labelKey: current });
  else crumbs[1] = { labelKey: "nav.dashboard" };
  return crumbs;
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t, direction } = useI18n();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionMessage, setSessionMessage] = useState("");
  const [sessionNeedsSignIn, setSessionNeedsSignIn] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileNavRef = useRef<HTMLElement>(null);
  const wasMobileNavOpen = useRef(false);

  useEffect(() => {
    const syncTheme = () => applyThemePreference(readDashboardPreferences().theme);
    const handleSystemThemeChange = () => {
      if (readDashboardPreferences().theme === "system") syncTheme();
    };
    syncTheme();
    window.addEventListener("faidatech:dashboard-preferences-changed", syncTheme);
    const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
    colorScheme.addEventListener("change", handleSystemThemeChange);
    return () => {
      window.removeEventListener("faidatech:dashboard-preferences-changed", syncTheme);
      colorScheme.removeEventListener("change", handleSystemThemeChange);
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as ApiEnvelope<Session>;
        if (response.status === 401) {
          if (active) setSessionNeedsSignIn(true);
          throw new Error(t("error.unauthorized"));
        }
        if (!response.ok) throw new Error(t("shell.sessionUnavailable"));
        if (active && body.data) {
          setSession(body.data);
          setSessionNeedsSignIn(false);
        }
      })
      .catch((error: unknown) => {
        if (active) setSessionMessage(error instanceof Error ? error.message : t("shell.sessionUnavailable"));
      });
    return () => { active = false; };
  }, [t]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileNavOpen) {
      mobileNavRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    } else if (wasMobileNavOpen.current) {
      mobileMenuButtonRef.current?.focus();
    }
    wasMobileNavOpen.current = mobileNavOpen;
    if (!mobileNavOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
        mobileMenuButtonRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || !mobileNavRef.current) return;
      const focusable = Array.from(mobileNavRef.current.querySelectorAll<HTMLElement>("a[href], button:not(:disabled)"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen]);

  async function signOut() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.assign("/login");
    }
  }

  const activeHref = pathname === "/dashboard/create" ? "/dashboard/qrcodes" : pathname;
  const isCreatePage = pathname === "/dashboard/create";
  const displayName = session?.user.name || session?.user.email || t("shell.workspaceMember");
  const crumbs = getBreadcrumbs(pathname);
  const backTarget = getBackTarget(pathname);

  return (
    <div className="dashboard-root min-h-screen bg-[#f7faf9] text-faida-navy md:flex">
      <aside className={`relative z-40 border-b border-slate-200 bg-white md:sticky md:top-0 md:flex md:h-screen ${sidebarCollapsed ? "md:w-[88px]" : "md:w-[248px]"} md:shrink-0 md:flex-col md:border-b-0 md:border-r md:transition-[width] md:duration-200 md:ease-in-out motion-reduce:md:transition-none`}>
        <div className={`flex items-center justify-between gap-3 px-4 py-4 sm:px-6 md:py-6 ${sidebarCollapsed ? "md:justify-center md:px-2" : "md:px-5"}`}>
          <Link href="/dashboard" className="flex min-w-0 items-center" aria-label={`FaidATech ${t("nav.dashboard")}`}>
            <Image src="/logo.png" alt="FaidATech" width={661} height={354} priority className={`h-auto w-[144px] object-contain ${sidebarCollapsed ? "md:w-6" : ""}`} />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/create" className="rounded-xl bg-faida-green px-3 py-2 text-xs font-bold text-faida-navy transition hover:bg-emerald-300 md:hidden">＋ {t("shell.create")}</Link>
            <button
              type="button"
              aria-label={sidebarCollapsed ? "Expand dashboard sidebar" : "Collapse dashboard sidebar"}
              aria-expanded={!sidebarCollapsed}
              aria-controls="dashboard-primary-navigation"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
              className="hidden h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-sm font-bold text-faida-slate transition hover:border-faida-teal hover:bg-teal-50 hover:text-faida-navy focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-100 md:grid"
            >
              <span aria-hidden="true">{sidebarCollapsed ? (direction === "rtl" ? "←" : "→") : (direction === "rtl" ? "→" : "←")}</span>
            </button>
            <button
              type="button"
              ref={mobileMenuButtonRef}
              aria-label={mobileNavOpen ? t("shell.closeMenu") : t("shell.openMenu")}
              aria-expanded={mobileNavOpen}
              aria-controls="dashboard-primary-navigation"
              onClick={() => setMobileNavOpen((open) => !open)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-faida-navy shadow-sm transition hover:border-faida-teal hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-100 md:hidden"
            >
              {mobileNavOpen ? <span className="text-xl leading-none" aria-hidden="true">×</span> : <span className="flex flex-col gap-1" aria-hidden="true"><span className="h-0.5 w-4 rounded bg-current" /><span className="h-0.5 w-4 rounded bg-current" /><span className="h-0.5 w-4 rounded bg-current" /></span>}
            </button>
          </div>
        </div>

        <nav
          ref={mobileNavRef}
          id="dashboard-primary-navigation"
          aria-label={t("shell.mainNavigation")}
          className={`${mobileNavOpen ? "absolute inset-x-3 top-full z-50 block rounded-2xl border border-slate-200 bg-white p-3 shadow-xl" : "hidden"} md:relative md:inset-auto md:z-auto md:block md:min-h-0 md:flex-1 md:space-y-1 md:overflow-y-auto md:rounded-none md:border-0 md:bg-transparent md:p-3 md:shadow-none`}
        >
          <div className="mb-3 px-2 pt-1 md:hidden"><LanguageSelector compact /></div>
          <p className={`mb-2 px-3 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 md:px-2 ${sidebarCollapsed ? "md:sr-only" : ""}`}>{t("shell.workspaceSection")}</p>
          {navigation.map((item) => {
            const active = activeHref === item.href || (item.href !== "/dashboard" && activeHref.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={sidebarCollapsed ? t(item.labelKey) : undefined}
                title={t(item.labelKey)}
                onClick={() => setMobileNavOpen(false)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${sidebarCollapsed ? "md:justify-center md:gap-0 md:px-2" : ""} ${
                  active ? "bg-emerald-50 text-emerald-900" : "text-slate-500 hover:bg-slate-50 hover:text-faida-navy"
                }`}
              >
                <span className={`grid h-7 w-7 place-items-center rounded-lg text-[11px] font-black ${active ? "bg-faida-green text-faida-navy" : "bg-slate-100 text-slate-500"}`} aria-hidden="true">{item.mark}</span>
                <span className={sidebarCollapsed ? "md:sr-only" : ""}>{t(item.labelKey)}</span>
              </Link>
            );
          })}
          <div className="mt-3 border-t border-slate-100 pt-3 md:hidden">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-100 text-xs font-extrabold text-teal-900">{displayName.slice(0, 1).toUpperCase()}</span>
              <span className="min-w-0"><strong className="block truncate text-xs text-faida-navy">{displayName}</strong><span className="block truncate text-[10px] text-faida-slate">{session?.organization.name || t("shell.loadingWorkspace")}</span></span>
            </div>
            <button type="button" onClick={signOut} disabled={loggingOut} className="mt-2 w-full rounded-xl px-3 py-2 text-start text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-faida-navy disabled:opacity-50">{loggingOut ? t("shell.signingOut") : t("common.signOut")}</button>
          </div>
        </nav>

        <div className={`hidden shrink-0 border-t border-slate-100 md:block ${sidebarCollapsed ? "md:p-2" : "md:p-4"}`}>
          <div className={`flex items-center gap-3 rounded-2xl bg-slate-50 p-3 ${sidebarCollapsed ? "md:flex-col md:gap-2 md:p-2" : ""}`}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-100 text-xs font-extrabold text-teal-900">{displayName.slice(0, 1).toUpperCase()}</span>
            <span className={`min-w-0 ${sidebarCollapsed ? "md:sr-only" : ""}`}><strong className="block truncate text-xs text-faida-navy">{displayName}</strong><span className="block truncate text-[10px] text-faida-slate">{session?.organization.name || t("shell.loadingWorkspace")}</span></span>
          </div>
          <button type="button" aria-label={loggingOut ? t("shell.signingOut") : t("common.signOut")} onClick={signOut} disabled={loggingOut} className={`mt-3 w-full rounded-xl px-3 py-2 text-start text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-faida-navy disabled:opacity-50 ${sidebarCollapsed ? "md:mt-2 md:flex md:justify-center md:px-2" : ""}`}><span aria-hidden="true" className={sidebarCollapsed ? "md:inline" : "md:hidden"}>↪</span><span className={sidebarCollapsed ? "md:sr-only" : ""}>{loggingOut ? t("shell.signingOut") : t("common.signOut")}</span></button>
        </div>
      </aside>

      {mobileNavOpen ? <button type="button" aria-label={t("shell.closeMenu")} onClick={() => setMobileNavOpen(false)} className="fixed inset-0 z-30 bg-faida-navy/25 backdrop-blur-[1px] md:hidden" /> : null}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 hidden items-center justify-between border-b border-slate-200/80 bg-white/90 px-8 py-4 backdrop-blur md:flex">
          <div><p className="text-xs font-semibold text-faida-slate">{session?.organization.name || t("shell.workspaceHeader")}</p><p className="mt-0.5 text-[11px] text-slate-400">{t("shell.tenantScopedOperations")}</p></div>
          <div className="flex items-center gap-3"><LanguageSelector compact /><Link href="/dashboard/create" className="rounded-xl bg-faida-green px-4 py-2.5 text-sm font-bold text-faida-navy shadow-sm transition hover:bg-emerald-300">＋ {t("common.createQr")}</Link></div>
        </header>
        {sessionMessage ? (
          <div role="status" className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 md:mx-8">
            <span>{sessionMessage}</span>{sessionNeedsSignIn ? <Link href="/login" className="font-bold underline underline-offset-2">{t("shell.signInAgain")}</Link> : null}
          </div>
        ) : null}
        <main className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 md:px-8 md:py-7">
          <div className={`${isCreatePage ? "mb-3 pb-3" : "mb-6 pb-4"} flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80`}>
            <nav aria-label={t("shell.mainNavigation")} className="min-w-0">
              <ol className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                {crumbs.map((crumb, index) => (
                  <li key={`${crumb.labelKey}-${index}`} className="flex min-w-0 items-center gap-2">
                    {index ? <span className="text-slate-300" aria-hidden="true">/</span> : null}
                    {crumb.href ? <Link href={crumb.href} className="truncate text-faida-slate transition hover:text-faida-teal">{t(crumb.labelKey)}</Link> : <span aria-current="page" className="truncate font-semibold text-faida-navy">{t(crumb.labelKey)}</span>}
                  </li>
                ))}
              </ol>
            </nav>
            {!isCreatePage ? <Link href={backTarget.href} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-faida-slate transition hover:border-faida-teal hover:bg-teal-50 hover:text-faida-navy focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-100">
              <span aria-hidden="true">{direction === "rtl" ? "→" : "←"}</span> {t("shell.backTo", { destination: t(backTarget.labelKey) })}
            </Link> : null}
          </div>
          {children}
        </main>
        <div className="border-t border-slate-200 bg-white px-5 py-3 md:hidden">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate text-xs text-faida-slate">{session?.organization.name || t("shell.workspaceHeader")}</span>
            <button type="button" onClick={signOut} disabled={loggingOut} className="shrink-0 text-xs font-semibold text-slate-500">{loggingOut ? t("shell.signingOut") : t("common.signOut")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
