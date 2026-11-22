"use client";

import type { WizardForm, WizardPurpose } from "@/components/dashboard/wizard/model";
import { useI18n } from "@/i18n/LocaleProvider";
import type { MessageKey } from "@/i18n/messages";
import { supportedLanguages } from "@/components/dashboard/wizard/model";
import SectorProfileEditor from "@/components/dashboard/wizard/SectorProfileEditor";

const copyKeys: Record<string, MessageKey> = {
  "Landing-page content": "field.landingContent",
  "Create a flexible mobile destination with a title, story, and optional call to action.": "field.landingContentNote",
  "Hero image URL": "field.heroImageUrl",
  "Short summary": "field.shortSummary",
  "Page body": "field.pageBody",
  "Button label": "field.buttonLabel",
  "Button URL": "field.buttonUrl",
  "A concise introduction": "placeholder.conciseIntroduction",
  "Write the visitor-facing content…": "placeholder.landingBody",
  "Learn more": "placeholder.learnMore",
  "Contact details": "field.contactDetails",
  "Build a contact card visitors can save to their phone.": "field.contactNote",
  "First name": "field.firstName",
  "Last name": "field.lastName",
  "Phone": "field.phone",
  "Email": "field.email",
  "Organization": "field.organization",
  "Title": "field.jobTitle",
  "Company or organization": "placeholder.organization",
  "Role or profession": "placeholder.role",
  "Address": "field.address",
  "Optional contact address": "placeholder.contactAddress",
  "Social links": "field.socialLinks",
  "Add profile URLs visitors can open from your contact card.": "field.socialLinksNote",
  "Add link": "field.addLink",
  "Platform": "field.socialPlatform",
  "Label": "field.socialLinkLabel",
  "Social platform": "field.socialPlatform",
  "Social link label": "field.socialLinkLabel",
  "Social profile URL": "field.socialProfileUrl",
  "Remove social link": "field.removeSocialLink",
  "Social": "placeholder.social",
  "Profile": "placeholder.profile",
  "Menu items": "field.menuItems",
  "Items with the same category name appear together in the visitor menu.": "field.menuItemsNote",
  "Item name": "field.itemName",
  "Category": "field.category",
  "Category description": "field.categoryDescription",
  "Price (ETB)": "field.priceETB",
  "Description": "field.description",
  "Item image URL": "field.itemImageUrl",
  "Available to order": "field.availableToOrder",
  "Remove menu item": "field.removeMenuItem",
  "Add another item": "field.addAnotherItem",
  "Special coffee": "placeholder.menuItem",
  "Coffee": "placeholder.menuCategory",
  "Optional category note": "placeholder.categoryNote",
  "Roasted locally": "placeholder.itemDescription",
  "Telebirr checkout metadata": "field.telebirrMetadata",
  "Optional. Adds a checkout button to the public menu when a URL is supplied.": "field.telebirrMetadataNote",
  "Merchant name": "field.merchantName",
  "Merchant code": "field.merchantCode",
  "Merchant or restaurant": "placeholder.merchant",
  "Optional code": "placeholder.optionalCode",
  "Checkout URL": "field.checkoutUrl",
  "Additional Telebirr metadata": "field.additionalMetadata",
  "Optional provider metadata stored alongside the checkout link.": "field.additionalMetadataNote",
  "Audio & place details": "field.audioPlaceDetails",
  "Add one or more audio links, the location coordinates, transcripts, and heritage media.": "field.guideSummaryNote",
  "Guide summary": "field.guideSummary",
  "A short introduction for visitors": "placeholder.conciseIntroduction",
  "Latitude": "field.latitude",
  "Longitude": "field.longitude",
  "Altitude (meters)": "field.altitude",
  "Optional": "common.optional",
  "Transcript text editor": "field.transcriptEditor",
  "Optional text shown under the audio player for each selected language.": "field.transcriptNote",
  "Historical media": "field.historicalMedia",
  "Add archive images, audio, video, or documents.": "field.mediaArchiveNote",
  "Add media": "field.addMedia",
  "Remove historical media": "field.removeHistoricalMedia",
  "Media type": "field.mediaType",
  "Image": "field.mediaTypeImage",
  "Video": "field.mediaTypeVideo",
  "Audio": "field.mediaTypeAudio",
  "Document": "field.mediaTypeDocument",
  "Media title": "field.mediaTitle",
  "Archive item": "placeholder.archiveItem",
  "Media URL": "field.mediaUrl",
  "Asset ID": "field.assetId",
  "Caption": "field.caption",
  "Optional visitor context": "placeholder.mediaCaption",
  "Hosted document": "field.hostedDocument",
  "The short code redirects visitors to this PDF while its hosted file metadata remains editable.": "field.hostedDocumentNote",
  "PDF URL": "field.pdfUrl",
  "File name": "field.fileName",
  "Hosted asset ID": "field.hostedAssetId",
  "Optional asset reference": "common.optional",
  "File size (bytes)": "field.fileSizeBytes",
  "Hosted asset metadata": "field.hostedAssetMetadata",
  "Optional asset properties retained with this document.": "field.hostedAssetMetadataNote",
  "Local checkout destination": "field.localCheckout",
  "Create a direct dynamic short link to a Telebirr or other hosted checkout URL.": "field.localCheckoutNote",
  "Payment / checkout URL": "field.checkoutUrl",
  "Payment handling:": "field.paymentHandling",
  "FaidATech stores the checkout destination and redirects visitors. It does not collect or process payment details.": "field.paymentHandlingNote",
  "Choose a destination type to add its details.": "field.chooseDestination",
  "Add field": "field.addMetadata",
  "Key": "field.metadataKey",
  "Value": "field.metadataValue",
 };

type Translator = ReturnType<typeof useI18n>["t"];
function localizedCopy(value: string | undefined, t: Translator): string | undefined {
  if (!value) return value;
  const key = copyKeys[value];
  return key ? t(key) : value;
}

function TextField({ label, value, onChange, placeholder, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean }) {
  const { t } = useI18n();
  return (
    <label className="block text-sm font-semibold text-slate-700">
      <span>{localizedCopy(label, t)}{required ? <span className="ms-1 text-rose-600">*</span> : null}</span>
      <input type={type} dir="auto" value={value} onChange={(event) => onChange(event.target.value)} placeholder={localizedCopy(placeholder, t)} required={required} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal text-faida-navy outline-none transition placeholder:text-slate-400 focus:border-faida-teal focus:ring-4 focus:ring-teal-50" />
    </label>
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 3 }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; rows?: number }) {
  const { t } = useI18n();
  return (
    <label className="block text-sm font-semibold text-slate-700">
      <span>{localizedCopy(label, t)}</span>
      <textarea dir="auto" value={value} onChange={(event) => onChange(event.target.value)} placeholder={localizedCopy(placeholder, t)} rows={rows} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal leading-6 text-faida-navy outline-none transition placeholder:text-slate-400 focus:border-faida-teal focus:ring-4 focus:ring-teal-50" />
    </label>
  );
}

function SectionTitle({ title, note }: { title: string; note?: string }) {
  const { t } = useI18n();
  return <div className="border-b border-slate-100 pb-3"><h3 className="text-base font-semibold text-faida-navy">{localizedCopy(title, t)}</h3>{note ? <p className="mt-1 text-xs leading-5 text-faida-slate">{localizedCopy(note, t)}</p> : null}</div>;
}

function KeyValueEditor({ title, note, rows, onChange }: { title: string; note?: string; rows: { key: string; value: string }[]; onChange: (rows: { key: string; value: string }[]) => void }) {
  const { t } = useI18n();
  const translatedTitle = localizedCopy(title, t) ?? title;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3"><div><h4 className="text-sm font-semibold text-slate-700">{translatedTitle}</h4>{note ? <p className="mt-0.5 text-xs text-faida-slate">{localizedCopy(note, t)}</p> : null}</div><button type="button" onClick={() => onChange([...rows, { key: "", value: "" }])} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-faida-navy hover:border-emerald-300">＋ {t("field.addMetadata")}</button></div>
      {rows.map((row, index) => (
        <div key={index} className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[0.8fr_1.2fr_auto]">
          <input aria-label={`${translatedTitle} ${t("field.metadataKey")}`} value={row.key} onChange={(event) => onChange(rows.map((item, i) => i === index ? { ...item, key: event.target.value } : item))} placeholder={t("field.metadataKey")} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-faida-teal" />
          <input aria-label={`${translatedTitle} ${t("field.metadataValue")}`} value={row.value} onChange={(event) => onChange(rows.map((item, i) => i === index ? { ...item, value: event.target.value } : item))} placeholder={t("field.metadataValue")} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-faida-teal" />
          <button type="button" aria-label={t("field.removeMetadata")} onClick={() => onChange(rows.filter((_, i) => i !== index))} className="rounded-lg px-2 text-sm text-slate-400 hover:bg-rose-50 hover:text-rose-700">×</button>
        </div>
      ))}
    </div>
  );
}

export default function PayloadEditor({ form, setFormAction }: { form: WizardForm; setFormAction: (next: WizardForm) => void }) {
  const { t } = useI18n();
  const purpose = form.purpose as WizardPurpose | null;

  if (purpose === "SECTOR_PROFILE") return <SectorProfileEditor form={form} setFormAction={setFormAction} />;

  if (purpose === "LANDING_PAGE") {
    return (
      <div className="space-y-5">
        <SectionTitle title="Landing-page content" note="Create a flexible mobile destination with a title, story, and optional call to action." />
        <TextField label="Hero image URL" value={form.landing.imageUrl} onChange={(value) => setFormAction({ ...form, landing: { ...form.landing, imageUrl: value } })} placeholder="https://images.example.com/…" type="url" />
        <TextField label="Short summary" value={form.landing.summary} onChange={(value) => setFormAction({ ...form, landing: { ...form.landing, summary: value } })} placeholder="A concise introduction" />
        <TextArea label="Page body" value={form.landing.body} onChange={(value) => setFormAction({ ...form, landing: { ...form.landing, body: value } })} placeholder="Write the visitor-facing content…" rows={6} />
        <div className="grid gap-4 sm:grid-cols-2"><TextField label="Button label" value={form.landing.buttonLabel} onChange={(value) => setFormAction({ ...form, landing: { ...form.landing, buttonLabel: value } })} placeholder="Learn more" /><TextField label="Button URL" value={form.landing.buttonUrl} onChange={(value) => setFormAction({ ...form, landing: { ...form.landing, buttonUrl: value } })} placeholder="https://example.com" type="url" /></div>
      </div>
    );
  }

  if (purpose === "VCARD") {
    return (
      <div className="space-y-5">
        <SectionTitle title="Contact details" note="Build a contact card visitors can save to their phone." />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="First name" value={form.vcard.firstName} onChange={(value) => setFormAction({ ...form, vcard: { ...form.vcard, firstName: value } })} placeholder="Aster" required />
          <TextField label="Last name" value={form.vcard.lastName} onChange={(value) => setFormAction({ ...form, vcard: { ...form.vcard, lastName: value } })} placeholder="Bekele" required />
          <TextField label="Phone" value={form.vcard.phone} onChange={(value) => setFormAction({ ...form, vcard: { ...form.vcard, phone: value } })} placeholder="+251 9…" type="tel" />
          <TextField label="Email" value={form.vcard.email} onChange={(value) => setFormAction({ ...form, vcard: { ...form.vcard, email: value } })} placeholder="name@example.com" type="email" />
          <TextField label="Organization" value={form.vcard.organization} onChange={(value) => setFormAction({ ...form, vcard: { ...form.vcard, organization: value } })} placeholder="Company or organization" />
          <TextField label="Title" value={form.vcard.jobTitle} onChange={(value) => setFormAction({ ...form, vcard: { ...form.vcard, jobTitle: value } })} placeholder="Role or profession" />
          <TextField label="Website" value={form.vcard.website} onChange={(value) => setFormAction({ ...form, vcard: { ...form.vcard, website: value } })} placeholder="https://example.com" type="url" />
          <TextField label="Address" value={form.vcard.address} onChange={(value) => setFormAction({ ...form, vcard: { ...form.vcard, address: value } })} placeholder="Optional contact address" />
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3"><div><h4 className="text-sm font-semibold text-slate-700">{t("field.socialLinks")}</h4><p className="mt-0.5 text-xs text-faida-slate">{t("field.socialLinksNote")}</p></div><button type="button" onClick={() => setFormAction({ ...form, socialLinks: [...form.socialLinks, { platform: t("placeholder.social"), label: t("placeholder.profile"), url: "" }] })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-faida-navy hover:border-emerald-300">＋ {t("field.addLink")}</button></div>
          {form.socialLinks.map((link, index) => (
            <div key={index} className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[0.8fr_0.8fr_1.4fr_auto]">
              <input aria-label={t("field.socialPlatform")} value={link.platform} onChange={(event) => setFormAction({ ...form, socialLinks: form.socialLinks.map((item, i) => i === index ? { ...item, platform: event.target.value } : item) })} placeholder={t("field.socialPlatform")} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-faida-teal" />
              <input aria-label={t("field.socialLinkLabel")} value={link.label} onChange={(event) => setFormAction({ ...form, socialLinks: form.socialLinks.map((item, i) => i === index ? { ...item, label: event.target.value } : item) })} placeholder={t("field.socialLinkLabel")} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-faida-teal" />
              <input aria-label={t("field.socialProfileUrl")} type="url" value={link.url} onChange={(event) => setFormAction({ ...form, socialLinks: form.socialLinks.map((item, i) => i === index ? { ...item, url: event.target.value } : item) })} placeholder="https://…" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-faida-teal" />
              <button type="button" aria-label={t("field.removeSocialLink")} onClick={() => setFormAction({ ...form, socialLinks: form.socialLinks.filter((_, i) => i !== index) })} className="rounded-lg px-2 text-sm text-slate-400 hover:bg-rose-50 hover:text-rose-700">×</button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (purpose === "MENU") {
    return (
      <div className="space-y-5">
        <SectionTitle title="Menu items" note="Items with the same category name appear together in the visitor menu." />
        {form.menuItems.map((item, index) => (
          <div key={index} className="relative grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2">
            <div className="absolute end-3 top-3"><button type="button" disabled={form.menuItems.length === 1} onClick={() => setFormAction({ ...form, menuItems: form.menuItems.filter((_, i) => i !== index) })} aria-label={t("field.removeMenuItem")} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-30">×</button></div>
            <div className="pe-8"><TextField label="Item name" value={item.name} onChange={(value) => setFormAction({ ...form, menuItems: form.menuItems.map((row, i) => i === index ? { ...row, name: value } : row) })} placeholder="Special coffee" required /></div>
            <TextField label="Category" value={item.category} onChange={(value) => setFormAction({ ...form, menuItems: form.menuItems.map((row, i) => i === index ? { ...row, category: value } : row) })} placeholder="Coffee" required />
            <TextField label="Category description" value={item.categoryDescription} onChange={(value) => setFormAction({ ...form, menuItems: form.menuItems.map((row, i) => i === index ? { ...row, categoryDescription: value } : row) })} placeholder="Optional category note" />
            <TextField label="Price (ETB)" value={item.priceETB} onChange={(value) => setFormAction({ ...form, menuItems: form.menuItems.map((row, i) => i === index ? { ...row, priceETB: value } : row) })} placeholder="120" type="number" required />
            <TextField label="Description" value={item.description} onChange={(value) => setFormAction({ ...form, menuItems: form.menuItems.map((row, i) => i === index ? { ...row, description: value } : row) })} placeholder="Roasted locally" />
            <TextField label="Item image URL" value={item.imageUrl} onChange={(value) => setFormAction({ ...form, menuItems: form.menuItems.map((row, i) => i === index ? { ...row, imageUrl: value } : row) })} placeholder={`https://… (${t("common.optional")})`} type="url" />
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 sm:col-span-2"><input type="checkbox" checked={item.isAvailable} onChange={(event) => setFormAction({ ...form, menuItems: form.menuItems.map((row, i) => i === index ? { ...row, isAvailable: event.target.checked } : row) })} className="h-4 w-4 rounded border-slate-300 accent-emerald-600" />{t("field.availableToOrder")}</label>
          </div>
        ))}
        <button type="button" onClick={() => setFormAction({ ...form, menuItems: [...form.menuItems, { name: "", category: "", categoryDescription: "", priceETB: "", description: "", imageUrl: "", isAvailable: true }] })} className="rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm font-bold text-faida-navy transition hover:border-faida-teal hover:bg-teal-50/40">＋ {t("field.addAnotherItem")}</button>
        <div className="space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
          <SectionTitle title="Telebirr checkout metadata" note="Optional. Adds a checkout button to the public menu when a URL is supplied." />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Merchant name" value={form.telebirr.merchantName} onChange={(value) => setFormAction({ ...form, telebirr: { ...form.telebirr, merchantName: value } })} placeholder="Merchant or restaurant" />
            <TextField label="Merchant code" value={form.telebirr.merchantCode} onChange={(value) => setFormAction({ ...form, telebirr: { ...form.telebirr, merchantCode: value } })} placeholder="Optional code" />
            <div className="sm:col-span-2"><TextField label="Checkout URL" value={form.telebirr.checkoutUrl} onChange={(value) => setFormAction({ ...form, telebirr: { ...form.telebirr, checkoutUrl: value } })} placeholder="https://…" type="url" /></div>
          </div>
          <KeyValueEditor title="Additional Telebirr metadata" note="Optional provider metadata stored alongside the checkout link." rows={form.telebirr.metadata} onChange={(metadata) => setFormAction({ ...form, telebirr: { ...form.telebirr, metadata } })} />
        </div>
      </div>
    );
  }

  if (purpose === "TOURISM_AUDIO") {
    return (
      <div className="space-y-5">
        <SectionTitle title="Audio & place details" note="Add one or more audio links, the location coordinates, transcripts, and heritage media." />
        <TextArea label="Guide summary" value={form.tourismSummary} onChange={(value) => setFormAction({ ...form, tourismSummary: value })} placeholder="A short introduction for visitors" rows={2} />
        <div className="grid gap-4 sm:grid-cols-2">
          {supportedLanguages.map((language) => <TextField key={language.id} label={t("field.audioUrl", { language: language.label })} value={form.audioLinks[language.id]} onChange={(value) => setFormAction({ ...form, audioLinks: { ...form.audioLinks, [language.id]: value } })} placeholder="https://…/audio.mp3" type="url" />)}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="Latitude" value={form.gps.latitude} onChange={(value) => setFormAction({ ...form, gps: { ...form.gps, latitude: value } })} placeholder="9.0192" type="number" required />
          <TextField label="Longitude" value={form.gps.longitude} onChange={(value) => setFormAction({ ...form, gps: { ...form.gps, longitude: value } })} placeholder="38.7525" type="number" required />
          <TextField label="Altitude (meters)" value={form.gps.altitudeMeters} onChange={(value) => setFormAction({ ...form, gps: { ...form.gps, altitudeMeters: value } })} placeholder="Optional" type="number" />
        </div>
        <div className="space-y-4">
          <div><h4 className="text-sm font-semibold text-slate-700">{t("field.transcriptEditor")}</h4><p className="mt-1 text-xs text-faida-slate">{t("field.transcriptNote")}</p></div>
          {supportedLanguages.map((language) => <TextArea key={language.id} label={t("field.transcriptLanguage", { language: language.label })} value={form.transcripts[language.id]} onChange={(value) => setFormAction({ ...form, transcripts: { ...form.transcripts, [language.id]: value } })} placeholder={t("placeholder.transcript", { language: language.label })} rows={3} />)}
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3"><div><h4 className="text-sm font-semibold text-slate-700">{t("field.historicalMedia")}</h4><p className="mt-0.5 text-xs text-faida-slate">{t("field.mediaArchiveNote")}</p></div><button type="button" onClick={() => setFormAction({ ...form, historicalMedia: [...form.historicalMedia, { kind: "DOCUMENT", url: "", title: "", caption: "", assetId: "" }] })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-faida-navy hover:border-emerald-300">＋ {t("field.addMedia")}</button></div>
          {form.historicalMedia.map((item, index) => (
            <div key={index} className="relative grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
              <button type="button" aria-label={t("field.removeHistoricalMedia")} onClick={() => setFormAction({ ...form, historicalMedia: form.historicalMedia.filter((_, i) => i !== index) })} className="absolute end-3 top-3 grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-700">×</button>
              <label className="block text-sm font-semibold text-slate-700">{t("field.mediaType")}<select value={item.kind} onChange={(event) => setFormAction({ ...form, historicalMedia: form.historicalMedia.map((row, i) => i === index ? { ...row, kind: event.target.value as typeof row.kind } : row) })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal outline-none focus:border-faida-teal"><option value="IMAGE">{t("field.mediaTypeImage")}</option><option value="VIDEO">{t("field.mediaTypeVideo")}</option><option value="AUDIO">{t("field.mediaTypeAudio")}</option><option value="DOCUMENT">{t("field.mediaTypeDocument")}</option></select></label>
              <div className="pe-8"><TextField label="Media title" value={item.title} onChange={(value) => setFormAction({ ...form, historicalMedia: form.historicalMedia.map((row, i) => i === index ? { ...row, title: value } : row) })} placeholder="Archive item" /></div>
              <TextField label="Media URL" value={item.url} onChange={(value) => setFormAction({ ...form, historicalMedia: form.historicalMedia.map((row, i) => i === index ? { ...row, url: value } : row) })} placeholder="https://…" type="url" />
              <TextField label="Asset ID" value={item.assetId} onChange={(value) => setFormAction({ ...form, historicalMedia: form.historicalMedia.map((row, i) => i === index ? { ...row, assetId: value } : row) })} placeholder="Optional" />
              <div className="sm:col-span-2"><TextArea label="Caption" value={item.caption} onChange={(value) => setFormAction({ ...form, historicalMedia: form.historicalMedia.map((row, i) => i === index ? { ...row, caption: value } : row) })} placeholder="Optional visitor context" rows={2} /></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (purpose === "PDF") {
    return (
      <div className="space-y-5">
        <SectionTitle title="Hosted document" note="The short code redirects visitors to this PDF while its hosted file metadata remains editable." />
        <TextField label="PDF URL" value={form.pdf.fileUrl} onChange={(value) => setFormAction({ ...form, pdf: { ...form.pdf, fileUrl: value } })} placeholder="https://files.example.com/guide.pdf" type="url" required />
        <div className="grid gap-4 sm:grid-cols-2"><TextField label="File name" value={form.pdf.fileName} onChange={(value) => setFormAction({ ...form, pdf: { ...form.pdf, fileName: value } })} placeholder="Visitor-guide.pdf" required /><TextField label="Hosted asset ID" value={form.pdf.assetId} onChange={(value) => setFormAction({ ...form, pdf: { ...form.pdf, assetId: value } })} placeholder="Optional asset reference" /><TextField label="File size (bytes)" value={form.pdf.fileSizeBytes} onChange={(value) => setFormAction({ ...form, pdf: { ...form.pdf, fileSizeBytes: value } })} placeholder="Optional" type="number" /></div>
        <KeyValueEditor title="Hosted asset metadata" note="Optional asset properties retained with this document." rows={form.pdf.hostedAssetMetadata} onChange={(hostedAssetMetadata) => setFormAction({ ...form, pdf: { ...form.pdf, hostedAssetMetadata } })} />
      </div>
    );
  }

  if (purpose === "LOCAL_PAYMENTS") {
    return (
      <div className="space-y-5">
        <SectionTitle title="Local checkout destination" note="Create a direct dynamic short link to a Telebirr or other hosted checkout URL." />
        <TextField label="Payment / checkout URL" value={form.paymentUrl} onChange={(value) => setFormAction({ ...form, paymentUrl: value })} placeholder="https://…" type="url" required />
        <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-4 text-sm leading-6 text-teal-950"><strong>{t("field.paymentHandling")}</strong> {t("field.paymentHandlingNote")}</div>
      </div>
    );
  }

  return <p className="text-sm text-faida-slate">{t("field.chooseDestination")}</p>;
}
