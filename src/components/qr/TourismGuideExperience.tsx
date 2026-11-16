"use client";

import { useEffect, useMemo, useState } from "react";
import type { z } from "zod";
import { localeMetadata, uniqueLocaleCodes, type LocaleCode } from "@/i18n/registry";
import { localizedField, localizedOverride, localizedText } from "@/i18n/localized-content";
import { useI18n } from "@/i18n/LocaleProvider";
import type { tourismAudioPayloadSchema } from "@/lib/qr/payload-schemas";
import { getReadableTextColor } from "@/lib/qr/brand-presentation";

type TourismPayload = z.infer<typeof tourismAudioPayloadSchema>;

type AvailableAudio = { id: LocaleCode; label: string; url: string };

const mediaTypeKey = {
  IMAGE: "field.mediaTypeImage",
  VIDEO: "field.mediaTypeVideo",
  AUDIO: "field.mediaTypeAudio",
  DOCUMENT: "field.mediaTypeDocument",
} as const;

export default function TourismGuideExperience({ payload }: { payload: TourismPayload }) {
  const { locale, t } = useI18n();
  const copy = localizedOverride(payload.localizedContent, locale);
  const availableLanguages = useMemo<AvailableAudio[]>(
    () => uniqueLocaleCodes.flatMap((code) => {
      const url = payload.audioLinks[code];
      return url ? [{ id: code, label: localeMetadata[code].nativeName, url }] : [];
    }),
    [payload.audioLinks],
  );
  const [selectedLanguage, setSelectedLanguage] = useState<LocaleCode>(locale);

  useEffect(() => {
    if (availableLanguages.some((language) => language.id === locale)) {
      setSelectedLanguage(locale);
    } else if (!availableLanguages.some((language) => language.id === selectedLanguage) && availableLanguages[0]) {
      setSelectedLanguage(availableLanguages[0].id);
    }
  }, [availableLanguages, locale, selectedLanguage]);

  const selectedAudio = availableLanguages.find((language) => language.id === selectedLanguage);
  const transcript = payload.transcripts?.[selectedLanguage];
  const title = localizedText(copy.title, payload.title);
  const summary = localizedText(copy.summary, payload.summary || payload.description || "");
  const accent = payload.branding?.accentColor ?? "#10B981";
  const accentText = getReadableTextColor(accent);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] bg-faida-navy p-5 text-white shadow-soft sm:p-7">
        <div className="flex items-center gap-3">
          {payload.branding?.logoUrl ? <img src={payload.branding.logoUrl} alt={`${payload.branding.brandName || t("visitor.organization")} ${t("branding.logoPreview")}`} className="h-10 w-10 rounded-xl bg-white object-contain p-1" /> : null}
          <div><p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: accent }}>{payload.branding?.brandName || t("visitor.audioNarration")}</p><h1 className="mt-2 text-2xl font-semibold leading-tight sm:text-3xl">{title}</h1></div>
        </div>
        {summary ? <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{summary}</p> : null}
        <div className="mt-6 flex flex-wrap gap-2" aria-label={t("visitor.chooseAudioLanguage")}>
          {availableLanguages.map((language) => <button key={language.id} type="button" onClick={() => setSelectedLanguage(language.id)} aria-pressed={selectedLanguage === language.id} lang={language.id} className={`rounded-full px-3 py-2 text-xs font-semibold transition ${selectedLanguage === language.id ? "" : "border border-white/20 bg-white/5 text-white hover:bg-white/10"}`} style={selectedLanguage === language.id ? { backgroundColor: accent, color: accentText } : undefined}>{language.label}</button>)}
        </div>
        <div className="mt-5 rounded-2xl bg-white/10 p-4">
          {selectedAudio ? <audio key={selectedAudio.url} className="w-full" style={{ accentColor: accent }} controls preload="none" src={selectedAudio.url}>{t("visitor.audioUnsupported")}</audio> : <p className="text-sm text-slate-200">{t("visitor.noAudio")}</p>}
          {selectedAudio ? <p className="mt-2 text-xs text-slate-300" lang={selectedAudio.id}>{selectedAudio.label} · {t("visitor.audioNarration")}</p> : null}
        </div>
      </section>

      {transcript ? <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><p className="text-xs font-bold uppercase tracking-[0.16em] text-faida-teal">{t("visitor.transcript")}{selectedAudio ? ` · ${selectedAudio.label}` : ""}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700" lang={selectedLanguage} dir={localeMetadata[selectedLanguage].direction}>{transcript}</p></section> : null}

      <a href={`https://maps.google.com/?q=${payload.gps.latitude},${payload.gps.longitude}`} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 transition hover:bg-emerald-50">
        <span><span className="block text-xs font-bold uppercase tracking-[0.14em]" style={{ color: accent }}>{t("visitor.explorePlace")}</span><span className="mt-1 block text-sm text-slate-600" dir="ltr">{payload.gps.latitude.toFixed(5)}, {payload.gps.longitude.toFixed(5)}</span></span>
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-lg" style={{ color: accent }} aria-hidden="true">↗</span>
      </a>

      {payload.historicalMedia.length ? <section>
        <div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-faida-teal">{t("visitor.fromArchive")}</p><h2 className="mt-1 text-lg font-semibold text-faida-navy">{t("visitor.storiesMedia")}</h2></div><span className="text-xs text-faida-slate">{t("visitor.mediaCount", { count: payload.historicalMedia.length })}</span></div>
        <div className="space-y-3">{payload.historicalMedia.map((item, index) => {
          const path = `tourism.historicalMedia[${index}]`;
          const kind = t(mediaTypeKey[item.kind]);
          const mediaTitle = localizedField(copy, `${path}.title`, item.title) || t("visitor.mediaResource", { kind });
          const caption = localizedField(copy, `${path}.caption`, item.caption);
          return <a key={`${item.url}-${index}`} href={item.url} target="_blank" rel="noreferrer" className="block rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-emerald-200"><span className="flex items-center justify-between gap-3"><span className="font-semibold text-faida-navy">{mediaTitle}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-faida-slate">{kind}</span></span>{caption ? <span className="mt-2 block text-sm leading-6 text-faida-slate">{caption}</span> : null}</a>;
        })}</div>
      </section> : null}
    </div>
  );
}
