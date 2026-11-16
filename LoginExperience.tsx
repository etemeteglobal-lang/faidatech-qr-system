"use client";

import Link from "next/link";
import LanguageSelector from "@/i18n/LanguageSelector";
import { useI18n } from "@/i18n/LocaleProvider";

export default function LoginExperience({ signInFailed }: { signInFailed: boolean }) {
  const { t } = useI18n();
  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <section className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-7 shadow-soft sm:p-9">
        <div className="mb-7 flex justify-end"><LanguageSelector compact /></div>
        <Link href="/" className="flex items-center gap-3" aria-label={`FaidATech ${t("common.home")}`}>
          <span className="grid h-10 w-10 grid-cols-2 gap-1 rounded-xl bg-faida-navy p-2"><span className="rounded-sm bg-faida-green" /><span className="rounded-sm border-2 border-white" /><span className="rounded-sm border-2 border-white" /><span className="rounded-sm bg-faida-teal" /></span>
          <span><strong className="block text-sm font-extrabold tracking-tight text-faida-navy">FaidATech</strong><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-faida-slate">{t("app.qrOperations")}</span></span>
        </Link>
        <p className="mt-10 text-xs font-bold uppercase tracking-[0.2em] text-faida-teal">{t("login.eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-faida-navy">{t("login.title")}</h1>
        <p className="mt-3 text-sm leading-6 text-faida-slate">{t("login.description")}</p>
        {signInFailed ? <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{t("login.failed")}</p> : null}
        <Link href="/api/auth/login" className="mt-7 flex w-full items-center justify-center gap-3 rounded-xl bg-faida-navy px-4 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800"><span className="grid h-5 w-5 grid-cols-2 gap-0.5" aria-hidden="true"><span className="rounded-[2px] bg-faida-green" /><span className="rounded-[2px] border border-white" /><span className="rounded-[2px] border border-white" /><span className="rounded-[2px] bg-faida-teal" /></span>{t("login.continueManus")}</Link>
        <p className="mt-5 text-center text-xs leading-5 text-slate-400">{t("login.securityNote")}</p>
      </section>
    </main>
  );
}
