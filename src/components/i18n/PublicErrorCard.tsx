"use client";

import type { MessageKey } from "@/i18n/messages";
import { useI18n } from "@/i18n/LocaleProvider";
import LanguageSelector from "@/i18n/LanguageSelector";

export default function PublicErrorCard({ messageKey }: { messageKey: MessageKey }) {
  const { t, direction } = useI18n();
  return (
    <main dir={direction} className="grid min-h-screen place-items-center px-5 py-10">
      <section className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-7 text-center shadow-soft">
        <div className="mb-5 flex justify-end"><LanguageSelector compact /></div>
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-xl font-bold text-faida-green">F</span>
        <h1 className="mt-5 text-xl font-semibold text-faida-navy">{t("visitor.destinationUnavailable")}</h1>
        <p className="mt-2 text-sm leading-6 text-faida-slate">{t(messageKey)}</p>
        <p className="mt-6 text-xs font-semibold text-slate-400">{t("visitor.poweredBy")}</p>
      </section>
    </main>
  );
}
