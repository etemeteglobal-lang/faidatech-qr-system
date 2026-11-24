import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import { requireTenantContext } from "@/lib/auth/tenant-context";
import { ensurePostgresConfigured, prisma } from "@/lib/prisma";
import { readBrandIdentity } from "@/lib/qr/brand";
import { generateQrPng, generateQrSvg } from "@/lib/qr/qr-image";

const idSchema = z.string().cuid();
const formatSchema = z.enum(["png", "svg"]);

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request);
    ensurePostgresConfigured();
    const id = idSchema.parse((await context.params).id);
    const format = formatSchema.parse(new URL(request.url).searchParams.get("format") ?? "png");
    const qrCode = await prisma.qRCode.findFirst({
      where: { id, organizationId: tenant.organizationId, deletedAt: null },
      select: { shortCode: true, payload: true, destinationType: true },
    });

    if (!qrCode) {
      throw new ApiError(404, "qr_not_found", "QR code not found.");
    }

    const qrForeground = readBrandIdentity(qrCode.payload)?.qrForeground;
    const rawPayload = qrCode.payload && typeof qrCode.payload === "object" && !Array.isArray(qrCode.payload) ? qrCode.payload as Record<string, unknown> : {};
    const qrBackground = typeof rawPayload.qrPageBackground === "string" ? rawPayload.qrPageBackground : undefined;
    const profileBranding = rawPayload.branding && typeof rawPayload.branding === "object" ? rawPayload.branding as Record<string, unknown> : {};
    const profileLogoUrl = qrCode.destinationType === "SECTOR_PROFILE" && typeof profileBranding.logoUrl === "string" ? profileBranding.logoUrl : undefined;
    const profileLogoPlacement = qrCode.destinationType === "SECTOR_PROFILE" && ["none", "center", "above"].includes(String(rawPayload.qrLogoPlacement)) ? rawPayload.qrLogoPlacement as "none" | "center" | "above" : "none";
    const body = format === "svg"
      ? await generateQrSvg(qrCode.shortCode, qrForeground, qrBackground, profileLogoUrl, profileLogoPlacement)
      : new Uint8Array(await generateQrPng(qrCode.shortCode, qrForeground, qrBackground, profileLogoUrl, profileLogoPlacement));
    const contentType = format === "svg" ? "image/svg+xml; charset=utf-8" : "image/png";
    return new Response(body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="faidatech-${qrCode.shortCode}.${format}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
