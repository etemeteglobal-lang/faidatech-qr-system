"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/LocaleProvider";

export default function ProfileShareActions() {
  const { t } = useI18n();
  const [notice, setNotice] = useState("");

  async function copyLink() {
    const link = window.location.href;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const field = document.createElement("textarea");
        field.value = link;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        const copied = document.execCommand("copy");
        field.remove();
        if (!copied) throw new Error("clipboard_unavailable");
      }
      setNotice(t("profile.linkCopied"));
    } catch {
      setNotice(t("profile.shareError"));
    }
  }

  async function shareProfile() {
    const shareData = { title: document.title, url: window.location.href };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setNotice("");
      } else {
        await copyLink();
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setNotice(t("profile.shareError"));
    }
  }

  return <div className="flex flex-wrap items-center gap-2">
    <button type="button" onClick={() => void shareProfile()} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900">{t("profile.share")}</button>
    <button type="button" onClick={() => void copyLink()} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">{t("profile.copyLink")}</button>
    {notice ? <span role="status" className="w-full text-xs text-slate-600">{notice}</span> : null}
  </div>;
}
