"use client";

import type { z } from "zod";
import type { BrandIdentity } from "@/lib/qr/brand";
import {
  landingPagePayloadSchema,
  menuPayloadSchema,
  tourismAudioPayloadSchema,
  vCardPayloadSchema,
  type destinationTypeSchema,
} from "@/lib/qr/payload-schemas";
import InteractiveMenu from "@/components/qr/InteractiveMenu";
import TourismGuideExperience from "@/components/qr/TourismGuideExperience";
import { getReadableTextColor } from "@/lib/qr/brand-presentation";
import { localizedField, localizedOverride, localizedText } from "@/i18n/localized-content";
import { useI18n } from "@/i18n/LocaleProvider";

type DestinationType = z.infer<typeof destinationTypeSchema>;
type VCardPayload = z.infer<typeof vCardPayloadSchema>;
type LandingPayload = z.infer<typeof landingPagePayloadSchema>;
type MenuPayload = z.infer<typeof menuPayloadSchema>;
type TourismPayload = z.infer<typeof tourismAudioPayloadSchema>;

type Props = {
  shortCode: string;
  title: string;
  destinationType: DestinationType;
  payload: unknown;
};

function brandPalette(branding?: BrandIdentity) {
  const accent = branding?.accentColor ?? "#10B981";
  return { accent, accentText: getReadableTextColor(accent) };
}

export default function PublicQrExperience({ shortCode, title, destinationType, payload }: Props) {
  const { locale, t } = useI18n();
  if (destinationType === "VCARD") {
    const card = payload as VCardPayload;
    const { accent, accentText } = brandPalette(card.branding);
    const copy = localizedOverride(card.localizedContent, locale);
    const firstName = localizedField(copy, "vcard.firstName", card.firstName) ?? card.firstName;
    const lastName = localizedField(copy, "vcard.lastName", card.lastName) ?? card.lastName;
    const fullName = `${firstName} ${lastName}`.trim();
    const displayTitle = localizedText(copy.title, fullName || title);
    const description = localizedText(copy.description, card.description ?? "");
    const organization = localizedField(copy, "vcard.organization", card.organization);
    const jobTitle = localizedField(copy, "vcard.jobTitle", card.jobTitle);
    const address = localizedField(copy, "vcard.address", card.address);
    return (
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-soft">
        <div className="bg-faida-navy p-6 text-white sm:p-8">
          <div className="mb-5 grid h-14 w-14 place-items-center overflow-hidden rounded-2xl text-xl font-black" style={{ backgroundColor: accent, color: accentText }}>
            {card.branding?.logoUrl ? <img src={card.branding.logoUrl} alt={`${card.branding.brandName || t("visitor.organization")} ${t("branding.logoPreview")}`} className="h-full w-full bg-white object-contain p-1" /> : `${card.firstName.slice(0, 1).toUpperCase()}${card.lastName.slice(0, 1).toUpperCase()}`}
          </div>
          {card.branding?.brandName ? <p className="mb-2 text-xs font-semibold text-slate-300">{card.branding.brandName}</p> : null}
          <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: accent }}>{t("visitor.digitalBusinessCard")}</p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{displayTitle}</h1>
          {jobTitle ? <p className="mt-1 text-sm text-slate-300">{jobTitle}</p> : null}
          {organization ? <p className="mt-1 text-sm text-slate-300">{organization}</p> : null}
          {description ? <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">{description}</p> : null}
        </div>
        <div className="space-y-3 p-5 sm:p-7">
          {card.phone ? <a href={`tel:${encodeURIComponent(card.phone)}`} className="block rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-faida-navy hover:border-emerald-200">{t("visitor.call")} {card.phone}</a> : null}
          {card.email ? <a href={`mailto:${encodeURIComponent(card.email)}`} className="block rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-faida-navy hover:border-emerald-200">{t("visitor.email")} {card.email}</a> : null}
          {card.website ? <a href={card.website} target="_blank" rel="noreferrer" className="block rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-faida-navy hover:border-emerald-200">{t("visitor.visitWebsite")}</a> : null}
          {address ? <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-faida-slate">{address}</p> : null}
          <a href={`/api/r/${encodeURIComponent(shortCode)}/vcard`} className="block rounded-xl px-4 py-3 text-center text-sm font-bold transition hover:opacity-90" style={{ backgroundColor: accent, color: accentText }} download>{t("visitor.downloadContact")}</a>
          {card.socialLinks.length ? <div className="flex flex-wrap gap-2 pt-2">{card.socialLinks.map((link, index) => <a key={`${link.platform}-${link.url}`} href={link.url} target="_blank" rel="noreferrer" className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50">{localizedField(copy, `vcard.socialLinks[${index}].label`, link.label)}</a>)}</div> : null}
        </div>
      </section>
    );
  }

  if (destinationType === "MENU") return <InteractiveMenu payload={payload as MenuPayload} />;
  if (destinationType === "TOURISM_AUDIO") return <TourismGuideExperience payload={payload as TourismPayload} />;

  const landing = payload as LandingPayload;
  const { accent, accentText } = brandPalette(landing.branding);
  const copy = localizedOverride(landing.localizedContent, locale);
  const localizedTitle = localizedText(copy.title, landing.title || title);
  const summary = localizedText(copy.summary, landing.summary ?? "");
  const description = localizedText(copy.description, landing.description ?? "");
  const body = localizedText(copy.body, landing.body ?? "");
  const buttonLabel = localizedText(copy.buttonLabel, landing.buttonLabel || t("common.continue"));
  const brandName = localizedText(copy.displayName, landing.branding?.brandName || t("visitor.destinationBrand"));
  return (
    <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-soft">
      {landing.imageUrl ? <img src={landing.imageUrl} alt="" className="h-56 w-full object-cover sm:h-72" /> : null}
      <div className="p-6 sm:p-8">
        <div className="mb-5 flex items-center gap-3">
          {landing.branding?.logoUrl ? <img src={landing.branding.logoUrl} alt={`${brandName} ${t("branding.logoPreview")}`} className="h-12 w-12 rounded-xl border border-slate-100 bg-white object-contain p-1" /> : <span className="grid h-12 w-12 place-items-center rounded-xl text-lg font-black" style={{ backgroundColor: accent, color: accentText }}>{(landing.branding?.brandName?.slice(0, 1) || "F").toUpperCase()}</span>}
          <span className="min-w-0"><span className="block text-xs font-semibold text-faida-slate">{brandName}</span><span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: accent }}>{t("visitor.connectedExperience")}</span></span>
        </div>
        <h1 className="text-2xl font-semibold text-faida-navy sm:text-3xl">{localizedTitle}</h1>
        {summary || description ? <p className="mt-3 text-base leading-7 text-faida-slate">{summary || description}</p> : null}
        {body ? <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-700">{body}</p> : null}
        {landing.buttonUrl ? <a href={landing.buttonUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex rounded-xl px-5 py-3 text-sm font-bold hover:opacity-90" style={{ backgroundColor: accent, color: accentText }}>{buttonLabel}</a> : null}
      </div>
    </article>
  );
}
