import { z } from "zod";
import { uniqueLocaleCodes } from "@/i18n/registry";

export const sharedServiceTypes = ["HERITAGE_GUIDE", "HOSPITALITY_MENU", "WIFI_WAYFINDING", "GOVERNMENT_GUIDE", "PUBLIC_TRANSPORT", "EVENT_GUIDE", "EDUCATION_LIBRARY", "PUBLIC_HEALTH"] as const;
const locale = z.enum(uniqueLocaleCodes);

export const sharedServiceInput = z.object({
  serviceType: z.enum(sharedServiceTypes),
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(1).max(180),
  summary: z.string().trim().max(500).optional().nullable(),
  supportedLocales: z.array(locale).min(1).max(uniqueLocaleCodes.length).default(["en"]),
  payload: z.record(z.string(), z.unknown()),
  cacheTtlSeconds: z.number().int().min(0).max(300).default(60),
});

export function validateSharedPayload(value: unknown): boolean {
  try {
    const serialized = JSON.stringify(value);
    if (Buffer.byteLength(serialized, "utf8") > 128 * 1024) return false;
    if (serialized.includes("__proto__")) return false;
    return true;
  } catch { return false; }
}
