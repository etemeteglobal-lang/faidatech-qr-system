import { Prisma, type DestinationType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, apiErrorResponse, readJsonBody } from "@/lib/api/errors";
import { requireTenantContext } from "@/lib/auth/tenant-context";
import { assertDynamicQrQuota, incrementDynamicQrUsage } from "@/lib/billing/entitlements";
import { ensurePostgresConfigured, prisma } from "@/lib/prisma";
import { readBrandIdentity } from "@/lib/qr/brand";
import { parseDestinationPayload, destinationTypeSchema } from "@/lib/qr/payload-schemas";
import { generateQrImageDataUrl } from "@/lib/qr/qr-image";
import { createShortCode, getPublicQrUrl } from "@/lib/qr/short-code";

const createQrCodeSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().max(5000).optional().nullable(),
    destinationType: destinationTypeSchema,
    payload: z.unknown(),
    campaignId: z.string().cuid().optional().nullable(),
    expiresAt: z.string().datetime().optional().nullable(),
  })
  .strict();

const listQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
    campaignId: z.string().cuid().optional(),
    search: z.string().trim().max(160).optional(),
  })
  .strict();

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request);
    ensurePostgresConfigured();
    const query = listQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));

    const baseWhere: Prisma.QRCodeWhereInput = {
      organizationId: tenant.organizationId,
      deletedAt: null,
      ...(query.campaignId ? { campaignId: query.campaignId } : {}),
    };
    const listWhere: Prisma.QRCodeWhereInput = {
      ...baseWhere,
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: "insensitive" } },
              { shortCode: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const scanWhere: Prisma.ScanAnalyticsWhereInput = {
      organizationId: tenant.organizationId,
      qrCode: { is: { deletedAt: null } },
      ...(query.campaignId ? { campaignId: query.campaignId } : {}),
    };
    const now = new Date();

    const [qrCodes, totalCount, totalQrCodes, activeQrCodes, totalScans, scanGroups] = await Promise.all([
      prisma.qRCode.findMany({
        where: listWhere,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: query.offset,
        take: query.limit,
        include: {
          campaign: { select: { id: true, name: true, status: true } },
          _count: { select: { scanEvents: true } },
        },
      }),
      prisma.qRCode.count({ where: listWhere }),
      prisma.qRCode.count({ where: baseWhere }),
      prisma.qRCode.count({
        where: {
          ...baseWhere,
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      }),
      prisma.scanAnalytics.count({ where: scanWhere }),
      prisma.scanAnalytics.groupBy({
        by: ["qrCodeId"],
        where: scanWhere,
        _count: { qrCodeId: true },
        orderBy: { _count: { qrCodeId: "desc" } },
        take: 8,
      }),
    ]);

    const scanCodeIds = scanGroups.map((group) => group.qrCodeId);
    const scanCodeDetails = scanCodeIds.length
      ? await prisma.qRCode.findMany({
          where: { id: { in: scanCodeIds }, organizationId: tenant.organizationId, deletedAt: null },
          select: { id: true, title: true, shortCode: true, destinationType: true },
        })
      : [];
    const scanCodeById = new Map(scanCodeDetails.map((record) => [record.id, record]));
    const topScans = scanGroups.flatMap((group) => {
      const record = scanCodeById.get(group.qrCodeId);
      return record ? [{ ...record, scanCount: group._count.qrCodeId }] : [];
    });
    const nextOffset = query.offset + qrCodes.length < totalCount ? query.offset + qrCodes.length : null;

    return Response.json(
      {
        data: qrCodes,
        pagination: { limit: query.limit, offset: query.offset, totalCount, nextOffset },
        summary: { totalQrCodes, activeQrCodes, totalScans },
        topScans,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request);
    ensurePostgresConfigured();
    await assertDynamicQrQuota(tenant.organizationId);
    const input = createQrCodeSchema.parse(await readJsonBody(request));
    const payload = parseDestinationPayload(input.destinationType, input.payload);

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

    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const shortCode = createShortCode();
      const redirectUrl = getPublicQrUrl(shortCode);
      const qrImageDataUrl = await generateQrImageDataUrl(shortCode, readBrandIdentity(payload)?.qrForeground);

      try {
        const qrCode = await prisma.qRCode.create({
          data: {
            organizationId: tenant.organizationId,
            campaignId: input.campaignId ?? null,
            shortCode,
            title: input.title,
            description: input.description ?? null,
            destinationType: input.destinationType as DestinationType,
            payload: payload as Prisma.InputJsonValue,
            expiresAt,
          },
          include: { campaign: { select: { id: true, name: true, status: true } } },
        });
        await incrementDynamicQrUsage(tenant.organizationId);
        revalidatePath("/dashboard");
        revalidatePath("/dashboard/qrcodes");
        revalidatePath("/dashboard/analytics");
        revalidatePath(`/r/${shortCode}`);

        return Response.json(
          { data: qrCode, redirectUrl, qrImageDataUrl },
          { status: 201, headers: { "Cache-Control": "private, no-store" } },
        );
      } catch (error) {
        if (!isUniqueConstraintError(error) || attempt === 2) {
          throw error;
        }
      }
    }

    throw new ApiError(500, "short_code_generation_failed", "Could not allocate a unique QR code.");
  } catch (error) {
    return apiErrorResponse(error);
  }
}
