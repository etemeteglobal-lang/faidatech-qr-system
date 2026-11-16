"use client";

import type { ReactNode } from "react";
import type { BrandIdentity } from "@/lib/qr/brand";
import type { LocalizedContent } from "@/i18n/localized-content";
import { useI18n } from "@/i18n/LocaleProvider";
import PublicVisitorHeader from "@/components/qr/PublicVisitorHeader";

export default function PublicVisitorLayout({
  children,
  title,
  localizedContent,
  branding,
}: {
  children: ReactNode;
  title: string;
  localizedContent?: LocalizedContent;
  branding?: BrandIdentity;
}) {
  const { direction, t } = useI18n();
  return (
    <main dir={direction} className="mx-auto min-h-screen w-full max-w-3xl px-4 py-5 sm:px-7 sm:py-10">
      <PublicVisitorHeader title={title} localizedContent={localizedContent} branding={branding} />
      {children}
      <footer className="py-5 text-center text-[11px] text-slate-400">{t("visitor.poweredBy")}</footer>
    </main>
  );
}
