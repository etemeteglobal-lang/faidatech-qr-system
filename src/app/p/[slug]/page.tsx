import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ensurePostgresConfigured, prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonObject = Record<string, unknown>;
type PageProps = { params: Promise<{ slug: string }> };

function object(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}
function text(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}
function safeHttpUrl(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch { return null; }
}
const SOCIAL_HOSTS: Record<string, string[]> = {
  instagram: ["instagram.com", "www.instagram.com"], facebook: ["facebook.com", "www.facebook.com", "fb.com"],
  linkedin: ["linkedin.com", "www.linkedin.com"], x: ["x.com", "www.x.com", "twitter.com", "www.twitter.com"],
  twitter: ["x.com", "www.x.com", "twitter.com", "www.twitter.com"], youtube: ["youtube.com", "www.youtube.com", "youtu.be"],
  tiktok: ["tiktok.com", "www.tiktok.com"], telegram: ["t.me", "telegram.me"], whatsapp: ["wa.me", "www.whatsapp.com"],
};
function socialUrl(value: unknown, platformValue: unknown): string | null {
  const url = safeHttpUrl(value);
  const platform = text(platformValue)?.toLowerCase();
  if (!url || !platform || !SOCIAL_HOSTS[platform]) return null;
  try { return SOCIAL_HOSTS[platform].includes(new URL(url).hostname.toLowerCase()) ? url : null; } catch { return null; }
}
function fieldKind(item: JsonObject): string {
  return String(item.type ?? item.kind ?? item.fieldType ?? "").toLowerCase();
}
function renderValue(value: unknown, key: string): React.ReactNode {
  const item = object(value);
  if (Object.keys(item).length) {
    const kind = fieldKind(item);
    const label = text(item.label ?? item.name) ?? key;
    const content = item.value ?? item.url ?? item.href;
    if (kind === "url" || kind === "link") {
      const href = safeHttpUrl(content);
      return href ? <a className="break-all font-semibold text-teal-800 underline underline-offset-2" href={href} target="_blank" rel="noopener noreferrer">{text(item.value ?? item.label) ?? href}</a> : null;
    }
    if (kind === "file") {
      const href = safeHttpUrl(item.url ?? item.href ?? item.value);
      return href ? <a className="font-semibold text-teal-800 underline underline-offset-2" href={href} target="_blank" rel="noopener noreferrer">{text(item.fileName ?? item.name) ?? "Open file"}</a> : null;
    }
    if (kind === "social") {
      const href = socialUrl(item.url ?? item.href ?? item.value, item.platform);
      return href ? <a className="font-semibold text-teal-800 underline underline-offset-2" href={href} target="_blank" rel="noopener noreferrer">{label}</a> : null;
    }
    if (kind === "text" || kind === "textarea" || kind === "email" || kind === "phone") {
      const valueText = text(content);
      return valueText ? <span className="whitespace-pre-wrap break-words">{valueText}</span> : null;
    }
    return null;
  }
  const plain = text(value);
  return plain ? <span className="whitespace-pre-wrap break-words">{plain}</span> : null;
}
function entries(value: unknown, excluded: string[] = []): [string, unknown][] {
  return Object.entries(object(value)).filter(([key, v]) => !excluded.includes(key) && !key.startsWith("_") && v !== null && v !== undefined && v !== "");
}
async function getProfile(slug: string) {
  ensurePostgresConfigured();
  const profiles = await prisma.businessProfile.findMany({
    where: { slug, approvalStatus: "APPROVED" },
    select: { displayName: true, sector: true, profileData: true, customFields: true },
    take: 2,
  });
  // Slugs are unique per organization; a path containing only the slug must not
  // accidentally publish an arbitrary tenant's content if two organizations collide.
  return profiles.length === 1 ? profiles[0] : null;
}
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getProfile(slug);
  if (!profile) return { title: "Profile not found · FaidATech", robots: { index: false, follow: false } };
  return { title: `${profile.displayName} · FaidATech`, description: `${profile.displayName} · ${profile.sector.replaceAll("_", " ").toLowerCase()}`, robots: { index: true, follow: true } };
}
export default async function PublicProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const profile = await getProfile(slug);
  if (!profile) notFound();
  const data = object(profile.profileData);
  const custom = object(profile.customFields);
  const background = typeof data._pageBackground === "string" && /^#[0-9a-fA-F]{6}$/.test(data._pageBackground) ? data._pageBackground : "#f1f5f9";
  const spotlight = data._spotlight === true || data._spotlight === "true";
  const review = object(data._review);
  const action = object(data._action);
  const actionUrl = safeHttpUrl(action.url ?? action.href);
  const displayData = entries(data, ["_pageBackground", "_spotlight", "_review", "_action", "_spotlightTitle", "_spotlightText"]);
  const customData = entries(custom, ["customSectorName"]);
  return <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-12" style={{ backgroundColor: background }}>
    <article className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {spotlight && <div className="bg-teal-800 px-6 py-2 text-center text-sm font-semibold text-white">{text(data._spotlightTitle) ?? "Featured profile"}</div>}
      <header className="border-b border-slate-100 px-6 py-8 sm:px-10">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-teal-800">{profile.sector.replaceAll("_", " ")}</p>
        <h1 className="mt-3 break-words text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{profile.displayName}</h1>
        {text(data._spotlightText) && spotlight && <p className="mt-4 text-base leading-7 text-slate-600">{text(data._spotlightText)}</p>}
      </header>
      <div className="space-y-8 px-6 py-7 sm:px-10 sm:py-9">
        {displayData.length > 0 && <section aria-label="Profile details" className="grid gap-4 sm:grid-cols-2">{displayData.map(([key, value]) => <div key={key} className="min-w-0 rounded-2xl bg-slate-50 p-4"><h2 className="mb-2 text-sm font-semibold text-slate-700">{key.replace(/([A-Z])/g, " $1").replaceAll("_", " ")}</h2><div className="text-sm leading-6 text-slate-800">{renderValue(value, key)}</div></div>)}</section>}
        {customData.length > 0 && <section><h2 className="mb-3 text-lg font-bold text-slate-900">More information</h2><dl className="divide-y divide-slate-100 rounded-2xl border border-slate-100 px-4">{customData.map(([key, value]) => <div key={key} className="grid gap-1 py-4 sm:grid-cols-[minmax(9rem,.4fr)_1fr] sm:gap-6"><dt className="text-sm font-semibold text-slate-600">{key.replace(/([A-Z])/g, " $1").replaceAll("_", " ")}</dt><dd className="min-w-0 text-sm leading-6 text-slate-800">{renderValue(value, key)}</dd></div>)}</dl></section>}
        {text(review.text ?? review.content) && <section className="rounded-2xl bg-amber-50 p-5"><h2 className="text-sm font-bold text-amber-950">{text(review.title) ?? "Review"}</h2><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-amber-950">{text(review.text ?? review.content)}</p>{text(review.author) && <p className="mt-3 text-xs font-semibold text-amber-900">{text(review.author)}</p>}</section>}
        {actionUrl && <div className="pt-1"><a href={actionUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-teal-800 px-6 py-3 text-center font-semibold text-white hover:bg-teal-900">{text(action.label) ?? "Visit website"}</a></div>}
      </div>
      <footer className="border-t border-slate-100 px-6 py-4 text-center text-xs text-slate-500">Public profile · FaidATech</footer>
    </article>
  </main>;
}
