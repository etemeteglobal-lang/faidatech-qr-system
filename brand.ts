import { z } from "zod";

const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a #RRGGBB value.");

function channelToLinear(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

export function qrForegroundContrastRatio(color: string): number {
  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) return 0;
  const channels = color.slice(1).match(/.{2}/g);
  if (!channels) return 0;
  const [red, green, blue] = channels.map((value) => channelToLinear(Number.parseInt(value, 16)));
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  return 1.05 / (luminance + 0.05);
}

export function isQrForegroundContrastSafe(color: string): boolean {
  return qrForegroundContrastRatio(color) >= 4.5;
}

export const validateQrForegroundContrast = isQrForegroundContrastSafe;

const logoUrlSchema = z.string().trim().min(1).max(2048).refine((value) => {
  if (value.startsWith("/manus-storage/")) {
    const key = value.slice("/manus-storage/".length);
    return key.length > 0 && /^[A-Za-z0-9._/-]+$/.test(key) && !key.includes("..") &&
      !key.startsWith("/") && !key.endsWith("/") && !key.includes("//");
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && Boolean(parsed.hostname) && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}, "Logo must be an HTTP(S) URL or a safe /manus-storage path.");

export const brandIdentitySchema = z.object({
  brandName: z.string().trim().max(120).optional(),
  logoUrl: logoUrlSchema.optional(),
  accentColor: hexColorSchema.optional(),
  qrForeground: hexColorSchema.refine(isQrForegroundContrastSafe, {
    message: "QR foreground color must have at least 4.5:1 contrast against white.",
  }).optional(),
}).strict();

export type BrandIdentity = z.infer<typeof brandIdentitySchema>;

/** Parse a standalone branding value, returning undefined when absent or invalid. */
export function normalizeBrandIdentity(value: unknown): BrandIdentity | undefined {
  const result = brandIdentitySchema.safeParse(value);
  return result.success ? result.data : undefined;
}

/** Read and validate optional branding from an unknown saved destination payload. */
export function readBrandIdentity(payload: unknown): BrandIdentity | undefined {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload) || !("branding" in payload)) {
    return undefined;
  }
  return normalizeBrandIdentity((payload as { branding?: unknown }).branding);
}
