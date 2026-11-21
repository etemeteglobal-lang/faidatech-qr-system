import { Prisma, type DestinationType } from "@prisma/client";
import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ApiError, apiErrorResponse, readJsonBody } from "@/lib/api/errors";
import { requireTenantContext } from "@/lib/auth/tenant-context";
import { ensurePostgresConfigured, prisma } from "@/lib/prisma";
import { readBrandIdentity } from "@/lib/qr/brand";
import { destinationTypeSchema, parseDestinationPayload } from "@/lib/qr/payload-schemas";
import { generateQrImageDataUrl } from "@/lib/qr/qr-image";

const idSchema = z.string().cuid();

const patchQrCodeSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(5000).optional().nullable(),
    destinationType: destinationTypeSchema.optional(),
    payload: z.unknown().optional(),
    campaignId: z.string().cuid().optional().nullable(),
    isActive: z.boolean().optional(),
    expiresAt: z.string().datetime().optional().nullable(),
  })
  .strict();

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function validatedId(context: RouteContext): Promise<string> {
  return idSchema.parse((await context.params).id);
}

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request);
    ensurePostgresConfigured();
    const id = await validatedId(context);
    const qrCode = await prisma.qRCode.findFirst({
      where: { id, organizationId: tenant.organizationId, deletedAt: null },
      include: { campaign: { select: { id: true, name: true, status: true } } },
    });

    if (!qrCode) {
      throw new ApiError(404, "qr_not_found", "QR code not found.");
    }

    return Response.json(
      { data: qrCode },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request);
    ensurePostgresConfigured();
    const id = await validatedId(context);
    const input = patchQrCodeSchema.parse(await readJsonBody(request));
    if (Object.keys(input).length === 0) {
      throw new ApiError(400, "empty_update", "Provide at least one field to update.");
    }

    const existing = await prisma.qRCode.findFirst({
      where: { id, organizationId: tenant.organizationId, deletedAt: null },
      select: { id: true, destinationType: true, payload: true },
    });
    if (!existing) {
      throw new ApiError(404, "qr_not_found", "QR code not found.");
    }

    const hasType = Object.prototype.hasOwnProperty.call(input, "destinationType");
    const hasPayload = Object.prototype.hasOwnProperty.call(input, "payload");
    if (hasType && !hasPayload) {
      throw new ApiError(400, "payload_required", "Provide a matching payload when changing destinationType.");
    }

    const destinationType = input.destinationType ?? existing.destinationType;
    const parsedPayload = hasPayload
      ? parseDestinationPayload(destinationType, input.payload)
      : undefined;

    if (input.campaignId) {
      const campaign = await prisma.campaign.findFirst({
        where: {
          id: input.campaignId,
          organizationId: tenant.organizationId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!campaign) {
        throw new ApiError(404, "campaign_not_found", "The selected campaign is unavailable.");
      }
    }

    await prisma.qRCode.updateMany({
      where: { id, organizationId: tenant.organizationId, deletedAt: null },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.destinationType !== undefined
          ? { destinationType: input.destinationType as DestinationType }
          : {}),
        ...(parsedPayload !== undefined ? { payload: parsedPayload as Prisma.InputJsonValue } : {}),
        ...(input.campaignId !== undefined ? { campaignId: input.campaignId } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.expiresAt !== undefined
          ? { expiresAt: input.expiresAt ? new Date(input.expiresAt) : null }
          : {}),
      },
    });

    const updated = await prisma.qRCode.findFirst({
      where: { id, organizationId: tenant.organizationId, deletedAt: null },
      include: { campaign: { select: { id: true, name: true, status: true } } },
    });
    if (!updated) {
      throw new ApiError(404, "qr_not_found", "QR code not found.");
    }
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/qrcodes");
    revalidatePath("/dashboard/analytics");
    revalidatePath(`/r/${updated.shortCode}`);
    const qrImageDataUrl = await generateQrImageDataUrl(
      updated.shortCode,
      readBrandIdentity(updated.payload)?.qrForeground,
    );

    return Response.json(
      { data: updated, qrImageDataUrl },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request);
    ensurePostgresConfigured();
    const id = await validatedId(context);
    const result = await prisma.qRCode.updateMany({
      where: { id, organizationId: tenant.organizationId, deletedAt: null },
      data: { isActive: false, deletedAt: new Date() },
    });

    if (result.count === 0) {
      throw new ApiError(404, "qr_not_found", "QR code not found.");
    }
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/qrcodes");
    revalidatePath("/dashboard/analytics");

    return new Response(null, { status: 204 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
