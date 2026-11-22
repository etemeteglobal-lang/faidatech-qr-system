import { z } from "zod";
import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import { ensurePostgresConfigured, prisma } from "@/lib/prisma";
import { parseDestinationPayload } from "@/lib/qr/payload-schemas";
import { SHORT_CODE_PATTERN } from "@/lib/qr/short-code";

const shortCodeSchema = z.string().regex(SHORT_CODE_PATTERN);
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ shortCode: string }>;
};

function escapeVCard(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  try {
    ensurePostgresConfigured();
    const shortCode = shortCodeSchema.parse((await context.params).shortCode);
    const qrCode = await prisma.qRCode.findFirst({
      where: {
        shortCode,
        isActive: true,
        deletedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { destinationType: true, payload: true },
    });

    if (!qrCode || (qrCode.destinationType !== "VCARD" && qrCode.destinationType !== "SECTOR_PROFILE")) {
      throw new ApiError(404, "vcard_not_found", "This contact card is unavailable.");
    }

    const payload = parseDestinationPayload(qrCode.destinationType, qrCode.payload);
    if (!("firstName" in payload)) {
      throw new ApiError(500, "invalid_vcard_payload", "The contact card is misconfigured.");
    }

    const fullName = `${payload.firstName} ${payload.lastName}`.trim();
    const isSectorProfile = qrCode.destinationType === "SECTOR_PROFILE";
    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `N:${escapeVCard(payload.lastName)};${escapeVCard(payload.firstName)};;;`,
      `FN:${escapeVCard(fullName)}`,
      ...(payload.organization ? [`ORG:${escapeVCard(payload.organization)}`] : []),
      ...(isSectorProfile && "role" in payload ? [`TITLE:${escapeVCard(payload.role)}`] : "jobTitle" in payload && payload.jobTitle ? [`TITLE:${escapeVCard(payload.jobTitle)}`] : []),
      ...(payload.phone ? [`TEL;TYPE=CELL:${escapeVCard(payload.phone)}`] : []),
      ...(payload.email ? [`EMAIL;TYPE=INTERNET:${escapeVCard(payload.email)}`] : []),
      ...(payload.website ? [`URL:${escapeVCard(payload.website)}`] : []),
      ...(payload.address ? [`ADR;TYPE=HOME:;;${escapeVCard(payload.address)};;;;`] : []),
      ...payload.socialLinks.map((link) => `X-SOCIALPROFILE;TYPE=${escapeVCard(link.platform)}:${escapeVCard(link.url)}`),
      "END:VCARD",
    ];

    return new Response(`${lines.join("\r\n")}\r\n`, {
      headers: {
        "Content-Type": "text/vcard; charset=utf-8",
        "Content-Disposition": `attachment; filename="faidatech-contact-${shortCode}.vcf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
