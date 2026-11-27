"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useI18n } from "@/i18n/LocaleProvider";
import type { MessageKey } from "@/i18n/messages";
import ProfileQrPreview from "@/components/dashboard/ProfileQrPreview";
import { verticalTemplates, type ProfileKindCode } from "@/lib/templates/registry";
import AnnouncementItemsEditor from "@/components/dashboard/wizard/AnnouncementItemsEditor";
import AnnouncementTicker from "@/components/qr/AnnouncementTicker";
import { normalizeAnnouncements, type ProfileAnnouncement } from "@/lib/qr/announcements";

type SocialPlatform = "telegram" | "tiktok" | "instagram" | "linkedin" | "whatsapp" | "youtube" | "facebook" | "x";
type CustomField = { id: number; name: string; value: string; kind: "text" | "link" | "file" | "social"; platform?: SocialPlatform; fileName?: string; allowVisitorDownload?: boolean };
type Profile = {
  id: string;
  sector: string;
  profileKind: string;
  displayName: string;
  slug?: string;
  approvalStatus: string;
  rejectionReason?: string | null;
  profileData?: unknown;
  customFields?: unknown;
};
type Envelope<T> = { data?: T; error?: { message?: string; code?: string } };

const RESERVED_PROFILE_KEYS = new Set([
  "_pageBackground", "_qrForeground", "_qrShape", "_qrDots", "_logoPlacement", "_qrLogo", "_brandLogo",
  "_showDetails", "_showSocial", "_showDocuments", "_showReviews", "_showSpotlight", "_showQuickActions", "_announcements",
  "_spotlightTitle", "_spotlightText", "_ratingMode", "_testimonialPrompt", "_review", "_action",
]);
const CUSTOM_PRESETS = ["Phone", "Email", "Website", "Address", "WhatsApp", "Facebook", "Instagram", "LinkedIn", "YouTube", "Telegram", "TikTok", "X", "Testimonial", "Rating", "Map"];
const SOCIAL_PLATFORMS: { value: SocialPlatform; label: string; host: string }[] = [
  { value: "telegram", label: "Telegram", host: "https://t.me/" },
  { value: "tiktok", label: "TikTok", host: "https://www.tiktok.com/@" },
  { value: "instagram", label: "Instagram", host: "https://www.instagram.com/" },
  { value: "linkedin", label: "LinkedIn", host: "https://www.linkedin.com/in/" },
  { value: "whatsapp", label: "WhatsApp", host: "https://wa.me/" },
  { value: "youtube", label: "YouTube", host: "https://www.youtube.com/@" },
  { value: "facebook", label: "Facebook", host: "https://www.facebook.com/" },
  { value: "x", label: "X", host: "https://x.com/" },
];
const sectorMessage = (code: string) => `template.sector.${code}` as MessageKey;
const fieldMessage = (name: string) => `template.field.${name}` as MessageKey;
const formKinds: ProfileKindCode[] = ["INDIVIDUAL", "ORGANIZATION", "GOVERNMENT", "GROUP"];
const CUSTOM_FIELD_TYPES: { value: CustomField["kind"]; label: (t: (key: MessageKey) => string) => string }[] = [
  { value: "text", label: (t) => t("field.description") },
  { value: "link", label: (t) => t("field.website") },
  { value: "file", label: (t) => t("field.mediaTypeDocument") },
  { value: "social", label: (t) => t("field.socialLinks") },
];

function safeExternalUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function objectStrings(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([key, item]) => {
    if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") return [key, String(item)];
    if ((key === "_announcements" || key === "announcements") && Array.isArray(item)) return [key, JSON.stringify(item)];
    if (item && typeof item === "object" && !Array.isArray(item)) {
      if (key === "_review" || key === "_action") return [key, JSON.stringify(item)];
      const record = item as Record<string, unknown>;
      const content = record.value ?? record.url ?? record.href ?? record.content;
      return [key, typeof content === "string" || typeof content === "number" ? String(content) : ""];
    }
    return [key, ""];
  }));
}

function platformFromName(name: string): SocialPlatform {
  const normalized = name.toLowerCase().replace(/[^a-z]/g, "");
  if (normalized === "tiktok") return "tiktok";
  if (normalized === "linkedin") return "linkedin";
  if (normalized === "whatsapp") return "whatsapp";
  if (normalized === "youtube") return "youtube";
  if (normalized === "facebook") return "facebook";
  if (normalized === "telegram") return "telegram";
  if (normalized === "x" || normalized === "twitter") return "x";
  return "instagram";
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : value === null || value === undefined ? "" : String(value);
}

function announcementSlots(value: unknown, legacy?: { text?: unknown; badge?: unknown; link?: unknown; type?: unknown; spotlightType?: unknown; mediaUrl?: unknown; spotlightMediaUrl?: unknown }): ProfileAnnouncement[] {
  const items = normalizeAnnouncements(value);
  for (const item of normalizeAnnouncements(undefined, legacy)) {
    const duplicate = items.some((existing) => (item.mediaUrl && existing.mediaUrl === item.mediaUrl) || (item.text && existing.text.trim() === item.text.trim() && existing.type === item.type));
    if (!duplicate) items.push(item);
  }
  items.splice(5);
  while (items.length < 3) items.push({ text: "", badge: "", link: "", type: "text" });
  return items;
}

export default function SectorProfileWizard() {
  const { t, locale } = useI18n();
  const formRef = useRef<HTMLFormElement>(null);
  const [sector, setSector] = useState<string>(verticalTemplates[0]?.code ?? "OTHER");
  const [customSectorName, setCustomSectorName] = useState("");
  const [showAllSectorFields, setShowAllSectorFields] = useState(false);
  const [profileKind, setProfileKind] = useState<ProfileKindCode>("ORGANIZATION");
  const [displayName, setDisplayName] = useState("");
  const [profileData, setProfileData] = useState<Record<string, string>>({});
  const [announcements, setAnnouncements] = useState<ProfileAnnouncement[]>(() => announcementSlots(undefined));
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [profilesLoadFailed, setProfilesLoadFailed] = useState(false);
  const [profilesLoadErrorKey, setProfilesLoadErrorKey] = useState<MessageKey>("templates.loadNetworkError");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [saveFailed, setSaveFailed] = useState(false);
  const [nextCustomId, setNextCustomId] = useState(1);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [storageQuota, setStorageQuota] = useState<{ used: string; limit: string } | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const template = useMemo(() => verticalTemplates.find((item) => item.code === sector), [sector]);
  const templateFields: readonly string[] = template?.fields ?? [];
  const sectorLabel = sector === "OTHER" ? customSectorName || t("templates.customSector") : t(sectorMessage(sector));
  const qrProfile = editingId
    ? profiles.find((profile) => profile.id === editingId && profile.approvalStatus === "APPROVED")
    : profiles.find((profile) => profile.approvalStatus === "APPROVED");
  const pageBackground = profileData._pageBackground || "#F7FAF9";
  const qrForeground = profileData._qrForeground || "#0F172A";
  const qrShape = profileData._qrShape || "square";
  const qrDots = profileData._qrDots || "square";
  const logoPlacement = profileData._logoPlacement || "center";
  const qrLogo = profileData._qrLogo || "";
  const brandLogo = profileData._brandLogo || "";

  const loadProfiles = useCallback(async () => {
    setProfilesLoading(true);
    setProfilesLoadFailed(false);
    try {
      const response = await fetch("/api/profiles?limit=50", { cache: "no-store" });
      let body: Envelope<Profile[]>;
      try {
        body = await response.json() as Envelope<Profile[]>;
      } catch {
        body = {};
      }
      if (!response.ok || !body.data) {
        setProfilesLoadErrorKey(body.error?.code === "profiles_storage_unavailable" ? "templates.schemaUnavailable" : "templates.loadNetworkError");
        throw new Error(body.error?.code ?? "profiles_load_failed");
      }
      setProfiles(body.data);
    } catch (error) {
      setProfilesLoadFailed(true);
      setProfiles([]);
      setProfilesLoadErrorKey(error instanceof Error && error.message === "profiles_storage_unavailable" ? "templates.schemaUnavailable" : "templates.loadNetworkError");
      throw error;
    } finally {
      setProfilesLoading(false);
    }
  }, []);

  useEffect(() => { void loadProfiles().catch(() => {}); }, [loadProfiles]);
  useEffect(() => {
    fetch("/api/profile-assets", { cache: "no-store" })
      .then((response) => response.json())
      .then((body: { data?: { storageBytesUsed?: string; storageBytesLimit?: string } }) => {
        if (body.data?.storageBytesUsed && body.data.storageBytesLimit) setStorageQuota({ used: body.data.storageBytesUsed, limit: body.data.storageBytesLimit });
      })
      .catch(() => {});
  }, []);

  function updateProfileSetting(key: string, value: string) {
    setProfileData((current) => ({ ...current, [key]: value }));
  }

  function sectionIsVisible(key: string) {
    if (key === "_showSpotlight") return profileData[key] === "true";
    return profileData[key] !== "false";
  }

  function resetForm() {
    setDisplayName("");
    setProfileData({});
    setAnnouncements(announcementSlots(undefined));
    setCustomFields([]);
    setProfileKind("ORGANIZATION");
    setEditingId(null);
    setCustomSectorName("");
    setShowAllSectorFields(false);
    setNextCustomId(1);
    setSaveFailed(false);
  }

  function parseCustomFields(value: unknown): CustomField[] {
    const custom = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
    return Object.entries(custom).filter(([name]) => name !== "customSectorName" && !name.startsWith("_")).map(([name, raw], index) => {
      const item = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : null;
      const kind: CustomField["kind"] = item?.type === "social" ? "social" : item?.type === "file" ? "file" : item?.type === "link" ? "link" : "text";
      return {
        id: index + 1,
        name,
        value: item ? stringValue(item.value ?? item.url ?? item.href) : stringValue(raw),
        kind,
        ...(kind === "social" ? { platform: platformFromName(stringValue(item?.platform || name)) } : {}),
        ...(item?.fileName ? { fileName: stringValue(item.fileName) } : {}),
        ...(kind === "file" ? { allowVisitorDownload: item?.allowVisitorDownload === true } : {}),
      };
    });
  }

  async function uploadFile(file: File, purpose?: "logo", replaceUrl?: string) {
    const form = new FormData();
    form.append("file", file);
    if (purpose) form.append("purpose", purpose);
    if (replaceUrl) form.append("replaceUrl", replaceUrl);
    const response = await fetch("/api/profile-assets", { method: "POST", body: form });
    const result = await response.json() as Envelope<{ url: string; storageUsedBytes?: string; storageLimitBytes?: string }>;
    if (!response.ok || !result.data?.url) {
      if (response.status === 402) setQuotaExceeded(true);
      throw new Error(response.status === 402 ? "storage_quota_exceeded" : "upload_failed");
    }
    if (result.data.storageUsedBytes && result.data.storageLimitBytes) setStorageQuota({ used: result.data.storageUsedBytes, limit: result.data.storageLimitBytes });
    setQuotaExceeded(false);
    return result.data.url;
  }

  async function handleLogoUpload(file: File | undefined, target: "brand" | "qr") {
    if (!file) return;
    setUploadingId(target === "brand" ? -1 : -2);
    setNotice("");
    try {
      const url = await uploadFile(file, "logo", target === "brand" ? brandLogo : qrLogo);
      updateProfileSetting(target === "brand" ? "_brandLogo" : "_qrLogo", url);
    } catch (error) {
      setNotice(error instanceof Error && error.message === "storage_quota_exceeded" ? t("templates.storageLimitReached") : t("templates.saveUnexpectedError"));
    } finally {
      setUploadingId(null);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setSaveFailed(false);
    setNotice("");
    const extensions: Record<string, unknown> = {};
    for (const field of customFields) {
      const key = field.name.trim();
      if (!key || !field.value.trim()) continue;
      if (Object.hasOwn(extensions, key) || RESERVED_PROFILE_KEYS.has(key) || key.startsWith("_")) {
        setNotice(t("templates.duplicateCustomField"));
        setSaveFailed(true);
        setBusy(false);
        return;
      }
      extensions[key] = field.kind === "social"
        ? { type: "social", platform: field.platform ?? platformFromName(key), value: field.value.trim(), label: key }
        : { type: field.kind === "file" ? "file" : field.kind === "link" ? "link" : "text", value: field.value.trim(), label: key, ...(field.fileName ? { fileName: field.fileName } : {}), ...(field.kind === "file" ? { allowVisitorDownload: field.allowVisitorDownload === true } : {}) };
    }
    const savedAnnouncements = announcements
      .map((item) => ({ text: item.text.trim(), badge: item.badge?.trim() ?? "", link: item.link?.trim() ?? "", mediaUrl: item.mediaUrl?.trim() ?? "", type: item.type ?? "text" }))
      .filter((item) => item.text || item.mediaUrl)
      .slice(0, 5)
      .map((item) => {
        const link = safeExternalUrl(item.link);
        const mediaUrl = safeExternalUrl(item.mediaUrl);
        const type = item.type === "image" || item.type === "video" ? item.type : "text";
        return {
          ...(item.text ? { text: item.text } : {}),
          type: type !== "text" && mediaUrl ? type : "text",
          ...(item.badge ? { badge: item.badge } : {}),
          ...(link ? { link } : {}),
          ...(mediaUrl ? { mediaUrl } : {}),
        };
      });
    const profileDataForSave = { ...profileData };
    for (const key of ["spotlight", "spotlightType", "spotlightMediaUrl", "_spotlightTitle", "_spotlightText", "_spotlightType", "_spotlightImage", "_spotlightMediaUrl", "_spotlightVideo", "_announcementLink"]) {
      delete profileDataForSave[key];
    }
    if (sector === "OTHER") extensions.customSectorName = customSectorName.trim();
    try {
      const response = await fetch(editingId ? `/api/profiles/${encodeURIComponent(editingId)}` : "/api/profiles", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", "X-Faida-Locale": locale },
        body: JSON.stringify({
          sector,
          ...(sector === "OTHER" ? { customSectorName: customSectorName.trim() } : {}),
          profileKind,
          displayName: displayName.trim(),
          profileData: Object.fromEntries(Object.entries({
            ...profileDataForSave,
            _announcements: JSON.stringify(savedAnnouncements),
            _ratingMode: sectionIsVisible("_showReviews") ? "stars-review" : "off",
          }).filter(([, value]) => value.trim()).map(([key, value]) => [key, value.trim()])),
          customFields: extensions,
        }),
      });
      let body: Envelope<Profile>;
      try {
        body = await response.json() as Envelope<Profile>;
      } catch {
        body = {};
      }
      if (!response.ok || !body.data) {
        const message = body.error?.code === "profiles_storage_unavailable"
          ? t("templates.schemaUnavailable")
          : response.status === 400
            ? t("templates.saveValidationError")
            : response.status === 503
              ? t("templates.schemaUnavailable")
              : t("templates.saveUnexpectedError");
        setNotice(message);
        setSaveFailed(true);
        return;
      }
      setNotice(editingId ? t("templates.updatedNotice") : t("templates.savedNotice"));
      resetForm();
      try {
        await loadProfiles();
      } catch {
        setNotice(t("templates.savedButRefreshFailed"));
      }
    } catch {
      setNotice(t("templates.saveNetworkError"));
      setSaveFailed(true);
    } finally {
      setBusy(false);
    }
  }

  function editProfile(profile: Profile) {
    setEditingId(profile.id);
    setSector(profile.sector);
    const custom = profile.customFields && typeof profile.customFields === "object" && !Array.isArray(profile.customFields) ? profile.customFields as Record<string, unknown> : {};
    setCustomSectorName(profile.sector === "OTHER" ? stringValue(custom.customSectorName) : "");
    setProfileKind(profile.profileKind as ProfileKindCode);
    setDisplayName(profile.displayName);
    const savedProfileData = objectStrings(profile.profileData);
    if (savedProfileData._spotlight !== undefined) {
      savedProfileData._showSpotlight = String(savedProfileData._spotlight === "true");
      delete savedProfileData._spotlight;
    }
    for (const key of ["_ratingMode", "_testimonialPrompt", "_spotlightTitle", "_spotlightText"]) {
      if (!savedProfileData[key] && typeof custom[key] === "string") savedProfileData[key] = custom[key] as string;
    }
    setAnnouncements(announcementSlots(savedProfileData._announcements ?? savedProfileData.announcements, {
      text: savedProfileData._spotlightText ?? custom._spotlightText ?? savedProfileData.spotlight,
      badge: savedProfileData._spotlightTitle ?? custom._spotlightTitle,
      link: savedProfileData._announcementLink ?? custom._announcementLink,
      type: savedProfileData._spotlightType ?? custom._spotlightType,
      spotlightType: savedProfileData._spotlightType ?? custom._spotlightType,
      mediaUrl: savedProfileData._spotlightMediaUrl ?? savedProfileData._spotlightImage ?? savedProfileData._spotlightVideo ?? custom._spotlightMediaUrl,
      spotlightMediaUrl: savedProfileData._spotlightMediaUrl ?? savedProfileData._spotlightImage ?? savedProfileData._spotlightVideo ?? custom._spotlightMediaUrl,
    }));
    if (!savedProfileData._showSpotlight && (custom._spotlight === true || custom._spotlight === "true")) savedProfileData._showSpotlight = "true";
    setProfileData(savedProfileData);
    const fields = parseCustomFields(profile.customFields);
    setCustomFields(fields);
    setNextCustomId(fields.length + 1);
    setNotice("");
    setSaveFailed(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function transition(profile: Profile, decision: "SUBMIT" | "APPROVE" | "REJECT") {
    setBusy(true);
    setNotice("");
    try {
      const reason = decision === "REJECT" ? window.prompt(t("templates.rejectionPrompt")) : undefined;
      if (decision === "REJECT" && !reason?.trim()) return;
      const response = await fetch(`/api/profiles/${encodeURIComponent(profile.id)}/approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Faida-Locale": locale },
        body: JSON.stringify({ decision, ...(reason ? { reason } : {}) }),
      });
      const body = await response.json() as Envelope<Profile>;
      if (!response.ok) throw new Error(body.error?.code ?? "approval_failed");
      setNotice(t("templates.approvalUpdated"));
      await loadProfiles();
    } catch {
      setNotice(t("templates.approvalError"));
    } finally {
      setBusy(false);
    }
  }

  async function importCsv(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/profiles/import", { method: "POST", headers: { "Content-Type": "text/csv", "X-Faida-Locale": locale }, body: await file.text() });
      const body = await response.json() as Envelope<{ createdCount: number; rejectedCount: number }>;
      if (!response.ok && response.status !== 207) throw new Error("import_failed");
      setNotice(t("templates.importSummary", { created: body.data?.createdCount ?? 0, rejected: body.data?.rejectedCount ?? 0 }));
      await loadProfiles();
    } catch {
      setNotice(t("templates.importError"));
    } finally {
      setBusy(false);
    }
  }

  function downloadCsvTemplate() {
    const rows = [
      [t("templates.csvSector"), t("templates.displayName"), t("templates.profileKind"), ...templateFields.map((field) => t(fieldMessage(field)))],
      [sector === "OTHER" ? customSectorName || t("templates.customSector") : t(sectorMessage(sector)), "", t("templates.organization"), ...templateFields.map(() => "")],
    ];
    const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `faidatech-${sector.toLowerCase()}-profiles.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function addCustomField(name = "", kind: CustomField["kind"] = "text") {
    if (name && customFields.some((field) => field.name.toLowerCase() === name.toLowerCase())) return;
    setCustomFields((current) => [...current, { id: nextCustomId, name, value: "", kind, ...(kind === "social" ? { platform: platformFromName(name) } : {}), ...(kind === "file" ? { allowVisitorDownload: false } : {}) }]);
    setNextCustomId((value) => value + 1);
  }

  const statusKey = (status: string): MessageKey => ({
    DRAFT: "templates.statusDraft",
    PENDING_APPROVAL: "templates.statusPending",
    APPROVED: "templates.statusApproved",
    REJECTED: "templates.statusRejected",
  }[status] as MessageKey) ?? "templates.statusDraft";
  const profileValue = (name: string) => customFields.find((field) => field.name.toLowerCase() === name.toLowerCase())?.value ?? "";
  const phoneValue = profileValue("Phone") || profileData.phone || "";
  const emailValue = profileValue("Email") || profileData.email || "";
  const whatsappValue = profileValue("WhatsApp");
  const addressValue = profileValue("Map") || profileValue("Address") || profileData.address || "";
  const ratingPreview = Number(profileValue("Rating"));
  const ratingStarsPreview = Number.isFinite(ratingPreview) && ratingPreview >= 0 && ratingPreview <= 5 ? "★".repeat(Math.round(ratingPreview)) + "☆".repeat(5 - Math.round(ratingPreview)) : "";
  const testimonialPreview = profileValue("Testimonial");
  const previewAnnouncements = announcements.filter((item) => item.text.trim()).slice(0, 5);
  const visibleCustomFields = customFields.filter((field) => field.name.trim() && field.value.trim());
  const socialFields = visibleCustomFields.filter((field) => field.kind === "social");
  const documentFields = visibleCustomFields.filter((field) => field.kind === "file");
  const displayCustomFields = visibleCustomFields.filter((field) => field.kind !== "file" && field.kind !== "social");

  return <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px] xl:gap-7">
    <div className="min-w-0 space-y-5">
      <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-800">{t("templates.sectorCount", { count: verticalTemplates.length })}</p><h2 className="mt-2 text-xl font-semibold text-faida-navy">{t("templates.title")}</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-faida-slate">{t("templates.description")}</p></div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={downloadCsvTemplate} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-faida-navy hover:bg-slate-50">{t("templates.downloadCsvTemplate")}</button><label className="cursor-pointer rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-faida-navy hover:bg-slate-50">{t("templates.importCsv")}<input className="sr-only" type="file" accept=".csv,text/csv" disabled={busy} onChange={(event) => { void importCsv(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} /></label></div>
        </div>
        <p className="mt-4 rounded-xl bg-teal-50 px-4 py-3 text-sm leading-6 text-teal-950">{t("templates.approvalFlow")} {t("templates.csvHint")}</p>
        <label className="mt-5 block text-sm font-semibold text-slate-700">{t("templates.chooseSector")}<select className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3" value={sector} onChange={(event) => { setSector(event.target.value); setProfileData((current) => Object.fromEntries(Object.entries(current).filter(([key]) => RESERVED_PROFILE_KEYS.has(key)))); setCustomFields([]); setShowAllSectorFields(false); }}>
          {verticalTemplates.map((item) => <option key={item.code} value={item.code}>{t(sectorMessage(item.code))}</option>)}
          <option value="OTHER">{t("templates.customSector")}</option>
        </select></label>
        {sector === "OTHER" ? <label className="mt-4 block text-sm font-semibold text-slate-700">{t("templates.customSectorName")}<input required maxLength={120} value={customSectorName} onChange={(event) => setCustomSectorName(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label> : null}
        {templateFields.length ? <div className="mt-3 flex flex-wrap gap-2">{templateFields.slice(0, 4).map((field) => <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-600" key={field}>{t(fieldMessage(field))}</span>)}</div> : null}
      </section>

      <form ref={formRef} onSubmit={saveProfile} className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div><h2 className="text-lg font-semibold text-faida-navy">{editingId ? t("templates.editDraft") : t("templates.createDraft")}</h2><p className="mt-1 text-sm text-faida-slate">{t("templates.formHint")}</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-700">{t("templates.profileKind")}<select className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3" value={profileKind} onChange={(event) => setProfileKind(event.target.value as ProfileKindCode)}>{formKinds.map((kind) => <option key={kind} value={kind}>{t(({ INDIVIDUAL: "templates.individual", ORGANIZATION: "templates.organization", GOVERNMENT: "templates.government", GROUP: "templates.group" } as const)[kind])}</option>)}</select></label>
          <label className="block text-sm font-semibold text-slate-700">{t("templates.displayName")}<input required maxLength={180} value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label>
        </div>
        <section className="rounded-2xl border border-slate-200 p-4">
          <h3 className="font-semibold text-faida-navy">{t("templates.profileIdentity")}</h3>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {brandLogo ? <img src={brandLogo} alt={t("templates.brandLogo")} className="h-14 w-14 rounded-xl border border-slate-200 bg-white object-contain p-1" /> : null}
            <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-faida-navy">{t("templates.brandLogo")}<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={uploadingId !== null || busy} onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; void handleLogoUpload(file, "brand"); }} /></label>
            <p className="max-w-lg text-xs leading-5 text-slate-500">{t("templates.brandLogoHint")}</p>
            {brandLogo ? <button type="button" onClick={() => updateProfileSetting("_brandLogo", "")} className="text-xs font-semibold text-rose-700 underline">{t("branding.removeLogo")}</button> : null}
          </div>
        </section>
        <div><h3 className="font-semibold text-faida-navy">{t("templates.sectorDetails")}</h3><p className="mt-1 text-xs leading-5 text-faida-slate">{t("templates.fieldsHint")}</p></div>
        <label className="block text-sm font-semibold text-slate-700">Key Highlights / Service Badges<textarea value={profileData._highlights ?? ""} onChange={(event) => updateProfileSetting("_highlights", event.target.value)} rows={3} placeholder="Locally owned, Same-day service, Licensed professionals" className="mt-1.5 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          {templateFields.filter((field) => !RESERVED_PROFILE_KEYS.has(field)).slice(0, showAllSectorFields ? undefined : 4).map((field) => <label key={field} className="block text-sm font-semibold text-slate-700">{t(fieldMessage(field))}<textarea rows={2} maxLength={20000} value={profileData[field] ?? ""} onChange={(event) => setProfileData((current) => ({ ...current, [field]: event.target.value }))} className="mt-1.5 w-full resize-y rounded-xl border border-slate-300 p-3 font-normal" /></label>)}
        </div>
        {templateFields.length > 4 ? <button type="button" onClick={() => setShowAllSectorFields((show) => !show)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-faida-navy">{showAllSectorFields ? t("templates.showCoreFields") : t("templates.showMoreFields")}</button> : null}

        <AnnouncementItemsEditor announcements={announcements} onChange={setAnnouncements} />

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="font-semibold text-faida-navy">{t("templates.designTitle")}</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-700">{t("templates.pageBackground")}<input aria-label={t("templates.pageBackground")} type="color" value={pageBackground} onChange={(event) => updateProfileSetting("_pageBackground", event.target.value)} className="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-white p-1" /></label>
            <label className="text-xs font-semibold text-slate-700">{t("templates.qrInk")}<input aria-label={t("templates.qrInk")} type="color" value={qrForeground} onChange={(event) => updateProfileSetting("_qrForeground", event.target.value)} className="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-white p-1" /></label>
            <label className="text-xs font-semibold text-slate-700">{t("templates.qrFrame")}<select value={qrShape} onChange={(event) => updateProfileSetting("_qrShape", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2"><option value="square">{t("templates.qrSquare")}</option><option value="rounded">{t("templates.qrRounded")}</option><option value="circle">{t("templates.qrCircle")}</option><option value="brand">{t("templates.qrBrand")}</option></select></label>
            <label className="text-xs font-semibold text-slate-700">{t("templates.qrDots")}<select value={qrDots} onChange={(event) => updateProfileSetting("_qrDots", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2"><option value="square">{t("templates.qrSquareDots")}</option><option value="round">{t("templates.qrRoundDots")}</option><option value="small">{t("templates.qrSmallDots")}</option><option value="large">{t("templates.qrLargeDots")}</option><option value="styled">{t("templates.qrStyledDots")}</option><option value="circle">Circle</option><option value="diamond">Diamond</option><option value="heart">Heart</option><option value="line">Line / Bars</option></select></label>
            <label className="text-xs font-semibold text-slate-700">{t("templates.logoPlacement")}<select value={logoPlacement} onChange={(event) => updateProfileSetting("_logoPlacement", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2"><option value="center">{t("templates.logoCenter")}</option><option value="top">{t("templates.logoTop")}</option><option value="bottom">{t("templates.logoBottom")}</option></select></label>
            <label className="text-xs font-semibold text-slate-700">{t("templates.qrLogoUpload")}<input type="file" accept="image/png,image/jpeg,image/webp" className="mt-1 block w-full text-xs" disabled={uploadingId !== null || busy} onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; void handleLogoUpload(file, "qr"); }} /></label>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">{t("templates.qrSafetyNote")}</p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="font-semibold text-faida-navy">{t("templates.profileSections")}</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {([
              ["_showDetails", "templates.sectionDetails"], ["_showSocial", "templates.sectionSocial"], ["_showDocuments", "templates.sectionDocuments"], ["_showReviews", "templates.sectionReviews"], ["_showQuickActions", "templates.sectionQuickActions"], ["_showSpotlight", "templates.sectionSpotlight"],
            ] as const).map(([key, messageKey]) => <label key={key} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2.5 text-sm text-slate-700"><input type="checkbox" checked={sectionIsVisible(key)} onChange={(event) => updateProfileSetting(key, String(event.target.checked))} />{t(messageKey)}</label>)}
          </div>
          {sectionIsVisible("_showSpotlight") ? <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-700">{t("templates.sectionSpotlight")}<input maxLength={120} value={profileData._spotlightTitle ?? ""} onChange={(event) => updateProfileSetting("_spotlightTitle", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-normal" /></label><label className="text-xs font-semibold text-slate-700">{t("templates.previewHint")}<textarea rows={2} maxLength={500} value={profileData._spotlightText ?? ""} onChange={(event) => updateProfileSetting("_spotlightText", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-normal" /></label></div> : null}
          {sectionIsVisible("_showReviews") ? <label className="mt-3 block text-xs font-semibold text-slate-700">{t("templates.sectionReviews")}<input maxLength={500} value={profileData._testimonialPrompt ?? ""} onChange={(event) => updateProfileSetting("_testimonialPrompt", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-normal" /></label> : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-faida-navy">{t("templates.customFieldsTitle")}</h3><p className="mt-1 text-xs leading-5 text-faida-slate">{t("templates.customFieldsHint")}</p></div><button type="button" onClick={() => addCustomField()} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-faida-navy">{t("templates.addCustomField")}</button></div>
          <div className="mt-3 flex flex-wrap gap-2">{CUSTOM_PRESETS.map((preset) => <button key={preset} type="button" onClick={() => addCustomField(preset, ["WhatsApp", "Facebook", "Instagram", "LinkedIn", "YouTube", "Telegram", "TikTok", "X"].includes(preset) ? "social" : preset === "Website" ? "link" : preset === "Testimonial" ? "text" : "text")} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-faida-navy">+ {preset}</button>)}</div>
          {customFields.map((field) => <div key={field.id} className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,0.8fr)_150px_auto]"><label className="text-xs font-semibold text-slate-600">{t("templates.customFieldName")}<input maxLength={80} value={field.name} onChange={(event) => setCustomFields((current) => current.map((item) => item.id === field.id ? { ...item, name: event.target.value } : item))} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm font-normal" /></label><label className="text-xs font-semibold text-slate-600">{t("templates.customFieldValue")}<select value={field.kind} onChange={(event) => setCustomFields((current) => current.map((item) => item.id === field.id ? { ...item, kind: event.target.value as CustomField["kind"], ...(event.target.value === "social" && !item.platform ? { platform: platformFromName(item.name) } : {}), ...(event.target.value === "file" ? { allowVisitorDownload: item.allowVisitorDownload === true } : {}) } : item))} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm">{CUSTOM_FIELD_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label(t)}</option>)}</select></label><button type="button" aria-label={t("templates.removeCustomField")} onClick={() => setCustomFields((current) => current.filter((item) => item.id !== field.id))} className="self-end rounded-lg border border-slate-300 px-3 py-2.5 text-sm">×</button></div>
            {field.kind === "social" ? <label className="mt-2 block text-xs font-semibold text-slate-600">{t("templates.socialPlatform")}<select value={field.platform ?? "instagram"} onChange={(event) => setCustomFields((current) => current.map((item) => item.id === field.id ? { ...item, platform: event.target.value as SocialPlatform } : item))} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm">{SOCIAL_PLATFORMS.map((platform) => <option key={platform.value} value={platform.value}>{platform.label}</option>)}</select></label> : null}
            {field.kind === "file" ? <div className="mt-2 space-y-2"><label className="block text-xs font-semibold text-slate-600">{t("templates.customFieldValue")}<input type="url" value={field.value} onChange={(event) => setCustomFields((current) => current.map((item) => item.id === field.id ? { ...item, value: event.target.value } : item))} placeholder="https://…" className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm font-normal" /></label><div className="flex flex-wrap items-center gap-2"><label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold">{t("field.addMedia")}<input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="sr-only" disabled={uploadingId !== null || busy} onChange={async (event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (!file) return; setUploadingId(field.id); try { const url = await uploadFile(file, undefined, field.value); setCustomFields((current) => current.map((item) => item.id === field.id ? { ...item, value: url, fileName: file.name } : item)); } catch (error) { setNotice(error instanceof Error && error.message === "storage_quota_exceeded" ? t("templates.storageLimitReached") : t("templates.saveUnexpectedError")); } finally { setUploadingId(null); } }} /></label><span className="text-xs text-slate-500">{uploadingId === field.id ? t("common.loading") : field.fileName || t("field.hostedDocument")}</span>{field.value && safeExternalUrl(field.value) ? <a href={safeExternalUrl(field.value)!} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-800 underline">{t("preview.openDocument")}</a> : null}</div><label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={field.allowVisitorDownload === true} onChange={(event) => setCustomFields((current) => current.map((item) => item.id === field.id ? { ...item, allowVisitorDownload: event.target.checked } : item))} className="h-4 w-4 accent-emerald-700" /><span>Allow visitors to download this file</span></label></div> : <textarea rows={1} maxLength={20000} value={field.value} onChange={(event) => setCustomFields((current) => current.map((item) => item.id === field.id ? { ...item, value: event.target.value } : item))} placeholder={field.kind === "link" || field.kind === "social" ? "https://…" : ""} className="mt-2 w-full rounded-lg border border-slate-300 p-2.5 text-sm font-normal" />}
          </div>)}
        </section>
        {storageQuota ? <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700"><span>{t("templates.storageUsage", { used: (Number(storageQuota.used) / 1048576).toFixed(1), limit: (Number(storageQuota.limit) / 1048576).toFixed(1) })}</span>{quotaExceeded ? <span className="font-semibold text-rose-700">{t("templates.storageLimitReached")} <a className="underline" href="/dashboard/billing">{t("templates.storageUpgrade")}</a></span> : null}</div> : null}
        <div className="flex flex-wrap gap-2"><button disabled={busy} className="rounded-xl bg-faida-green px-4 py-2.5 text-sm font-bold text-faida-navy disabled:opacity-50">{busy ? t("common.loading") : editingId ? t("templates.saveChanges") : t("templates.saveDraft")}</button>{saveFailed && !busy ? <button type="button" onClick={() => formRef.current?.requestSubmit()} className="rounded-xl border border-rose-300 px-4 py-2.5 text-sm font-semibold text-rose-800">{t("templates.saveRetry")}</button> : null}{editingId ? <button type="button" onClick={resetForm} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-faida-navy">{t("common.cancel")}</button> : null}</div>
      </form>

      <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-faida-navy">{t("templates.savedProfiles")}</h2>
        <div className="mt-4 space-y-3">{profiles.map((profile) => <article key={profile.id} className="rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-faida-navy">{profile.displayName}</h3><p className="mt-1 text-xs text-slate-500">{profile.sector === "OTHER" ? stringValue((profile.customFields as Record<string, unknown> | undefined)?.customSectorName) || t("templates.customSector") : t(sectorMessage(profile.sector))} · {t(({ INDIVIDUAL: "templates.individual", ORGANIZATION: "templates.organization", GOVERNMENT: "templates.government", GROUP: "templates.group" } as Record<string, MessageKey>)[profile.profileKind] ?? "templates.organization")}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{t(statusKey(profile.approvalStatus))}</span></div>
          {profile.rejectionReason ? <p className="mt-2 text-xs text-rose-700">{profile.rejectionReason}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">{profile.slug && profile.approvalStatus === "APPROVED" ? <a href={`/p/${encodeURIComponent(profile.slug)}`} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-teal-700 px-3 py-1.5 text-xs font-semibold text-teal-800">{t("profile.publicLabel")}</a> : null}{["DRAFT", "REJECTED"].includes(profile.approvalStatus) ? <><button type="button" disabled={busy} onClick={() => editProfile(profile)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold">{t("templates.editDraft")}</button><button type="button" disabled={busy} onClick={() => void transition(profile, "SUBMIT")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold">{t("templates.submitForApproval")}</button></> : null}{profile.approvalStatus === "PENDING_APPROVAL" ? <><button type="button" disabled={busy} onClick={() => void transition(profile, "APPROVE")} className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white">{t("templates.approve")}</button><button type="button" disabled={busy} onClick={() => void transition(profile, "REJECT")} className="rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white">{t("templates.reject")}</button></> : null}</div>
        </article>)}{profilesLoading ? <p role="status" className="text-sm text-slate-500">{t("common.loading")}</p> : profilesLoadFailed ? <div role="alert" className="flex flex-wrap items-center justify-between gap-3 text-sm text-rose-700"><span>{t(profilesLoadErrorKey)}</span><button type="button" onClick={() => void loadProfiles().catch(() => {})} className="rounded-lg border border-rose-300 px-3 py-1.5 font-semibold">{t("templates.retryLoad")}</button></div> : !profiles.length ? <p className="text-sm text-slate-500">{t("templates.noProfiles")}</p> : null}</div>
        <p className="mt-4 text-xs leading-5 text-slate-500">{t("templates.csvFormat")}</p>
      </section>
      {notice ? <p role="status" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{notice}</p> : null}
    </div>

    <aside className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-faida-teal">{t("templates.profilePreview")}</p><p className="mt-1 text-xs text-faida-slate">{t("templates.previewHint")}</p>
      <div className="mx-auto mt-5 w-full max-w-[292px] rounded-[34px] border-[7px] border-faida-navy bg-faida-navy p-1.5 shadow-xl"><div className="max-h-[70vh] min-h-[410px] overflow-y-auto overscroll-contain scroll-smooth rounded-[25px]" style={{ backgroundColor: pageBackground }}>
        <div className="sticky top-0 z-10 flex h-8 items-center justify-center bg-white"><span className="h-1.5 w-14 rounded-full bg-slate-200" /></div>
        <AnnouncementTicker announcements={previewAnnouncements} />
        <div className="px-4 pb-5 pt-5">
          {brandLogo ? <img src={brandLogo} alt={t("templates.brandLogo")} className="mb-3 h-10 max-w-24 object-contain" /> : null}
          {!previewAnnouncements.length && sectionIsVisible("_showSpotlight") && (profileData._spotlightTitle || profileData._spotlightText) ? <div className="mb-3 rounded-xl bg-teal-800 px-3 py-2 text-[10px] font-semibold text-white">{profileData._spotlightTitle || t("profile.featured")}{profileData._spotlightText ? <p className="mt-1 font-normal">{profileData._spotlightText}</p> : null}</div> : null}
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-teal-800">{sectorLabel}</p><h2 className="mt-2 break-words text-lg font-bold text-faida-navy">{displayName.trim() || t("templates.previewName")}</h2><p className="mt-1 text-[10px] text-faida-slate">{t(({ INDIVIDUAL: "templates.individual", ORGANIZATION: "templates.organization", GOVERNMENT: "templates.government", GROUP: "templates.group" } as const)[profileKind])}</p>
          {sectionIsVisible("_showDetails") && (profileData._highlights || profileData.highlights) ? <div className="mt-3 flex flex-wrap gap-1">{String(profileData._highlights || profileData.highlights).split(/[\n,]/).map((item) => item.trim()).filter(Boolean).slice(0, 12).map((item) => <span key={item} className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-900">{item}</span>)}</div> : null}
          {sectionIsVisible("_showDetails") ? <div className="mt-4 space-y-2">{templateFields.filter((field) => profileData[field]?.trim()).map((field) => <div key={field} className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[9px] font-bold text-teal-800">{t(fieldMessage(field))}</p><p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-[10px] leading-4 text-slate-700">{profileData[field]}</p></div>)}</div> : null}
          {sectionIsVisible("_showDetails") && !templateFields.some((field) => profileData[field]?.trim()) ? <p className="mt-5 rounded-xl border border-dashed border-slate-300 p-4 text-center text-[10px] leading-5 text-faida-slate">{t("templates.previewEmpty")}</p> : null}
          {sectionIsVisible("_showDetails") ? displayCustomFields.map((field) => <div key={field.id} className="mt-2 rounded-xl border border-slate-200 bg-white p-3"><p className="text-[9px] font-bold text-teal-800">{field.name}</p>{(field.kind === "link" || field.kind === "social") && safeExternalUrl(field.value) ? <a href={safeExternalUrl(field.value)!} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all text-[10px] leading-4 text-teal-800 underline">{field.value}</a> : <p className="mt-1 line-clamp-3 break-words text-[10px] leading-4 text-slate-700">{field.value}</p>}</div>) : null}
          {sectionIsVisible("_showSocial") && socialFields.length ? <div className="mt-3 space-y-2">{socialFields.map((field) => <div key={field.id} className="flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white p-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-[8px] font-bold text-white">{SOCIAL_PLATFORMS.find((platform) => platform.value === field.platform)?.label.slice(0, 2)}</span><span className="min-w-0"><span className="block text-[8px] font-bold uppercase text-slate-500">{SOCIAL_PLATFORMS.find((platform) => platform.value === field.platform)?.label}</span><span className="block truncate text-[10px] font-semibold">{field.value || field.name}</span></span></div>)}</div> : null}
          {sectionIsVisible("_showDocuments") && documentFields.length ? <div className="mt-3 space-y-2">{documentFields.map((field) => <div key={field.id} className="rounded-xl border border-slate-200 bg-white p-2 text-[10px] font-semibold">{field.name}</div>)}</div> : null}
          {sectionIsVisible("_showReviews") && (ratingStarsPreview || testimonialPreview || profileData._testimonialPrompt) ? <div className="mt-3 rounded-xl bg-amber-50 p-3"><p className="text-[9px] font-bold text-amber-950">{t("templates.sectionReviews")}</p>{ratingStarsPreview ? <p className="mt-1 text-xs tracking-widest text-amber-600">{ratingStarsPreview}</p> : null}{profileData._testimonialPrompt ? <p className="mt-1 text-[9px] text-amber-950">{profileData._testimonialPrompt}</p> : null}{testimonialPreview ? <p className="mt-1 line-clamp-3 text-[9px] leading-4 text-amber-950">“{testimonialPreview}”</p> : null}</div> : null}
          {sectionIsVisible("_showQuickActions") ? <div className="mt-3 grid grid-cols-3 gap-2">{phoneValue ? <a href={`tel:${encodeURIComponent(phoneValue)}`} className="rounded-lg bg-teal-800 px-2 py-2 text-center text-[9px] font-semibold text-white">{t("profile.call")}</a> : null}{emailValue ? <a href={`mailto:${encodeURIComponent(emailValue)}`} className="rounded-lg bg-teal-800 px-2 py-2 text-center text-[9px] font-semibold text-white">{t("profile.message")}</a> : !emailValue && whatsappValue ? <a href={`https://wa.me/${encodeURIComponent(whatsappValue.replace(/\D/g, ""))}`} className="rounded-lg bg-green-700 px-2 py-2 text-center text-[9px] font-semibold text-white">{t("profile.message")}</a> : null}{addressValue ? <a href={`https://maps.google.com/?q=${encodeURIComponent(addressValue)}`} className="rounded-lg border border-teal-800 px-2 py-2 text-center text-[9px] font-semibold text-teal-900">{t("profile.map")}</a> : null}</div> : null}
          {qrProfile?.slug ? <ProfileQrPreview compact path={`/p/${encodeURIComponent(qrProfile.slug)}`} foreground={qrForeground} dots={qrDots} frame={qrShape} logoUrl={qrLogo || brandLogo} logoPlacement={logoPlacement} downloadLabel={t("templates.profileQrDownload")} printLabel={t("templates.profileQrPrint")} /> : <p className="mt-4 text-center text-[9px] leading-4 text-slate-500">{t("templates.profileQrPending")}</p>}
        </div><div className="flex h-6 items-center justify-center bg-white"><span className="h-1 w-16 rounded-full bg-slate-300" /></div>
      </div></div>
      {qrProfile?.slug ? <ProfileQrPreview path={`/p/${encodeURIComponent(qrProfile.slug)}`} foreground={qrForeground} dots={qrDots} frame={qrShape} logoUrl={qrLogo || brandLogo} logoPlacement={logoPlacement} downloadLabel={t("templates.profileQrDownload")} printLabel={t("templates.profileQrPrint")} /> : null}
    </aside>
  </div>;
}
