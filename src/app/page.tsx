"use client";

import Link from "next/link";
import LanguageSelector from "@/i18n/LanguageSelector";
import { useI18n } from "@/i18n/LocaleProvider";

const modules = [
  { number: "01", title: "home.contactTitle", description: "home.contactDescription", tag: "VCARD" },
  { number: "02", title: "home.menuTitle", description: "home.menuDescription", tag: "MENU" },
  { number: "03", title: "home.tourismTitle", description: "home.tourismDescription", tag: "GUIDE" },
  { number: "04", title: "home.documentsTitle", description: "home.documentsDescription", tag: "PDF" },
] as const;

export default function HomePage() {
  const { t, direction } = useI18n();
  return (
    <main dir={direction} className="mx-auto min-h-screen max-w-7xl px-5 pb-16 pt-6 sm:px-8 lg:px-12">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-5">
        <Link href="/" aria-label={`FaidATech ${t("common.home")}`} className="flex items-center gap-3">
          <span className="grid h-10 w-10 grid-cols-2 gap-1 rounded-xl bg-faida-navy p-2 shadow-soft" aria-hidden="true"><span className="rounded-sm bg-faida-green" /><span className="rounded-sm border-2 border-white" /><span className="rounded-sm border-2 border-white" /><span className="rounded-sm bg-faida-teal" /></span>
          <span><span className="block text-sm font-extrabold tracking-tight text-faida-navy">FaidATech</span><span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-faida-slate">{t("app.qrOperations")}</span></span>
        </Link>
        <div className="flex flex-wrap items-center gap-2"><LanguageSelector compact /><Link href="/login" className="rounded-lg px-3 py-2 text-xs font-semibold text-faida-slate transition hover:bg-slate-100 hover:text-faida-navy">{t("home.signIn")}</Link><Link href="/dashboard" className="rounded-lg bg-faida-green px-3 py-2 text-xs font-bold text-faida-navy transition hover:bg-emerald-300 sm:px-4">{t("home.openDashboard")}</Link></div>
      </header>

      <section className="relative overflow-hidden pb-14 pt-14 sm:pb-20 sm:pt-20">
        <div className="pointer-events-none absolute -right-20 -top-16 hidden h-80 w-80 rounded-full border border-emerald-100/80 rtl:-left-20 rtl:right-auto sm:block" />
        <div className="pointer-events-none absolute -right-8 top-0 hidden h-56 w-56 rounded-full border border-teal-100/90 rtl:-left-8 rtl:right-auto sm:block" />
        <div className="relative max-w-3xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-800"><span className="h-1.5 w-1.5 rounded-full bg-faida-green" />{t("home.tagline")}</p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-faida-navy sm:text-6xl">{t("home.headline")} <span className="text-faida-green">{t("home.headlineAccent")}</span></h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-faida-slate sm:text-lg sm:leading-8">{t("home.description")}</p>
          <div className="mt-8 flex flex-wrap gap-3"><span className="rounded-lg bg-faida-navy px-4 py-2.5 text-sm font-semibold text-white">{t("home.dynamicRoute")} <code dir="ltr" className="ms-1 rounded bg-white/10 px-1.5 py-0.5 text-emerald-200">/r/[shortCode]</code></span><span className="rounded-lg border border-slate-200 bg-white/70 px-4 py-2.5 text-sm font-semibold text-faida-slate">{t("home.techStack")}</span></div>
        </div>
      </section>

      <section aria-labelledby="modules-heading" className="border-t border-slate-200/80 pt-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-faida-teal">{t("home.modules")}</p><h2 id="modules-heading" className="mt-2 text-2xl font-semibold tracking-tight text-faida-navy">{t("home.resolverHeadline")}</h2></div><span className="hidden text-xs text-faida-slate sm:block">{t("home.dynamicRecords")}</span></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{modules.map((module) => <article key={module.number} className="group rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200"><div className="flex items-center justify-between"><span className="text-xs font-bold tabular-nums text-faida-green">{module.number}</span><span className="rounded-md bg-slate-50 px-2 py-1 text-[10px] font-bold tracking-[0.12em] text-faida-slate">{module.tag}</span></div><h3 className="mt-8 text-base font-semibold text-faida-navy">{t(module.title)}</h3><p className="mt-2 text-sm leading-6 text-faida-slate">{t(module.description)}</p></article>)}</div>
      </section>

      <footer className="mt-14 flex flex-col justify-between gap-2 border-t border-slate-200/80 pt-5 text-xs text-faida-slate sm:flex-row"><span>{t("home.footer")}</span><span>{t("home.databaseNote")}</span></footer>
    </main>
  );
}
