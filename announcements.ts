export type ProfileAnnouncement = {
  text: string;
  badge?: string;
  link?: string;
};

export type LegacyAnnouncement = {
  text?: unknown;
  badge?: unknown;
  link?: unknown;
};

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function safeHttpLink(value: unknown): string | undefined {
  const raw = stringValue(value);
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function announcement(value: unknown): ProfileAnnouncement | null {
  if (typeof value === "string") {
    const text = stringValue(value);
    return text ? { text } : null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  const text = stringValue(item.text ?? item.message ?? item.title ?? item.value);
  if (!text) return null;
  const badge = stringValue(item.badge ?? item.label);
  const link = safeHttpLink(item.link ?? item.url ?? item.href);
  return { text, ...(badge ? { badge } : {}), ...(link ? { link } : {}) };
}

/**
 * Normalize current announcement arrays and older one-off spotlight fields.
 * An explicit empty array means the owner intentionally removed all ticker items,
 * so it does not fall back to the legacy single announcement.
 */
export function normalizeAnnouncements(value: unknown, legacy?: LegacyAnnouncement): ProfileAnnouncement[] {
  if (Array.isArray(value)) return value.map(announcement).filter((item): item is ProfileAnnouncement => item !== null);
  if (value !== undefined && value !== null) {
    const single = announcement(value);
    if (single) return [single];
  }
  const item = announcement({ text: legacy?.text, badge: legacy?.badge, link: legacy?.link });
  return item ? [item] : [];
}
