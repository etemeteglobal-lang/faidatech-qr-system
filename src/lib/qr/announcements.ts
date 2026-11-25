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

function parseSerialized(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) return value;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return value;
  }
}

/**
 * Normalize current arrays, JSON-serialized arrays, and older single spotlight
 * fields. An explicit empty array intentionally suppresses legacy fallback.
 */
export function normalizeAnnouncements(value: unknown, legacy?: LegacyAnnouncement): ProfileAnnouncement[] {
  const normalizedValue = typeof value === "string" ? parseSerialized(value) : value;
  if (Array.isArray(normalizedValue)) return normalizedValue.map(announcement).filter((item): item is ProfileAnnouncement => item !== null);
  if (normalizedValue && typeof normalizedValue === "object") {
    const single = announcement(normalizedValue);
    if (single) return [single];
  }
  if (typeof normalizedValue === "string" && normalizedValue !== value) {
    const parsedSingle = announcement(normalizedValue);
    if (parsedSingle) return [parsedSingle];
  }
  if (value !== undefined && value !== null && typeof value !== "string") {
    const single = announcement(value);
    if (single) return [single];
  }
  const item = announcement({ text: legacy?.text, badge: legacy?.badge, link: legacy?.link });
  return item ? [item] : [];
}
