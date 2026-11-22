import { notFound } from "next/navigation";
import { ensurePostgresConfigured, prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonObject = Record<string, unknown>;
type RouteContext = { params: Promise<{ slug: string }> };

function object(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function text(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  return "";
}

function fieldText(value: unknown): string {
  const record = object(value);
  return text(record.value ?? record.url ?? value);
}

function vcardValue(value: string) {
  return value.replaceAll("\\", "\\\\").replace(/\r\n?/g, "\\n").replaceAll("\n", "\\n").replaceAll(";", "\\;").replaceAll(",", "\\,").trim();
}

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const { slug } = await context.params;
  ensurePostgresConfigured();
  const profiles = await prisma.businessProfile.findMany({
    where: { slug, approvalStatus: "APPROVED" },
    select: { displayName: true, profileData: true, customFields: true },
    take: 2,
  });
  if (profiles.length !== 1) notFound();

  const profile = profiles[0];
  const data = object(profile.profileData);
  const custom = object(profile.customFields);
  const phone = fieldText(custom.Phone ?? data.phone);
  const email = fieldText(custom.Email ?? data.email);
  const website = fieldText(custom.Website ?? data.website);
  const address = fieldText(custom.Address ?? custom.Map ?? data.address);
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${vcardValue(profile.displayName)}`, `N:${vcardValue(profile.displayName)};;;;`];
  if (phone) lines.push(`TEL;TYPE=CELL:${vcardValue(phone)}`);
  if (email) lines.push(`EMAIL;TYPE=INTERNET:${vcardValue(email)}`);
  if (website) {
    try {
      const url = new URL(website);
      if (url.protocol === "https:" || url.protocol === "http:") lines.push(`URL:${vcardValue(url.href)}`);
    } catch {
      // Ignore incomplete or malformed optional website values.
    }
  }
  if (address) lines.push(`ADR;TYPE=WORK:;;${vcardValue(address)};;;;`);
  lines.push("END:VCARD");
  const filename = `${slug.replace(/[^A-Za-z0-9_-]/g, "-") || "profile"}-contact.vcf`;
  return new Response(`${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
