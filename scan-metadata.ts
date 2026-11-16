import { createHmac, hkdfSync } from "node:crypto";

function boundedHeader(headers: Headers, names: string[], limit: number): string | null {
  for (const name of names) {
    const value = headers.get(name)?.trim();
    if (value && value.toLowerCase() !== "unknown") {
      return value.slice(0, limit);
    }
  }
  return null;
}

function identifyOs(userAgent: string): string | null {
  if (/Android/i.test(userAgent)) return "Android";
  if (/iPhone|iPad|iPod|iOS/i.test(userAgent)) return "iOS";
  if (/Windows/i.test(userAgent)) return "Windows";
  if (/Mac OS X|Macintosh/i.test(userAgent)) return "macOS";
  if (/CrOS/i.test(userAgent)) return "ChromeOS";
  if (/Linux/i.test(userAgent)) return "Linux";
  return null;
}

function identifyDevice(userAgent: string): "MOBILE" | "TABLET" | "DESKTOP" | "BOT" | "UNKNOWN" {
  if (/bot|crawler|spider|preview/i.test(userAgent)) return "BOT";
  if (/iPad|Tablet|Kindle|Silk/i.test(userAgent)) return "TABLET";
  if (/Mobile|iPhone|Android/i.test(userAgent)) return "MOBILE";
  if (/Windows|Macintosh|Linux|CrOS/i.test(userAgent)) return "DESKTOP";
  return "UNKNOWN";
}

export function extractScanMetadata(headers: Headers) {
  const userAgent = headers.get("user-agent")?.slice(0, 1500) ?? null;
  const candidateIp =
    headers.get("x-real-ip")?.trim() ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;
  const ipHashSecret = process.env.SCAN_IP_HASH_SECRET ?? process.env.MANUS_JWT_SECRET;
  const derivedIpHashKey = ipHashSecret
    ? Buffer.from(hkdfSync("sha256", Buffer.from(ipHashSecret), "faidatech-scan-ip", "ip-hash-v1", 32))
    : null;
  const ipHash = candidateIp && derivedIpHashKey
    ? createHmac("sha256", derivedIpHashKey).update(candidateIp).digest("hex")
    : null;

  return {
    deviceType: userAgent ? identifyDevice(userAgent) : "UNKNOWN" as const,
    deviceOS: userAgent ? identifyOs(userAgent) : null,
    userAgent,
    ipHash,
    countryCode: boundedHeader(headers, ["cf-ipcountry", "x-vercel-ip-country", "x-geo-country"], 8),
    region: boundedHeader(headers, ["x-vercel-ip-country-region", "x-geo-region"], 100),
    city: boundedHeader(headers, ["x-vercel-ip-city", "x-geo-city"], 100),
  };
}
