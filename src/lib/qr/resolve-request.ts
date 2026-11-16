import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import { ensurePostgresConfigured, prisma } from "@/lib/prisma";
import { scheduleQrScan } from "@/lib/qr/scan-logging";
import { parseDestinationPayload } from "@/lib/qr/payload-schemas";
import { SHORT_CODE_PATTERN } from "@/lib/qr/short-code";

const shortCodeSchema = z.string().regex(SHORT_CODE_PATTERN, "Invalid QR short code.");

export async function resolveQrRequest(request: NextRequest, candidateShortCode: string): Promise<Response> {
  const parsedShortCode = shortCodeSchema.safeParse(candidateShortCode);
  if (!parsedShortCode.success) {
    return apiErrorResponse(parsedShortCode.error);
  }

  try {
    ensurePostgresConfigured();
    const now = new Date();
    const qrCode = await prisma.qRCode.findFirst({
      where: {
        shortCode: parsedShortCode.data,
        isActive: true,
        deletedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: {
        id: true,
        organizationId: true,
        campaignId: true,
        shortCode: true,
        title: true,
        destinationType: true,
        payload: true,
      },
    });

    if (!qrCode) {
      throw new ApiError(404, "qr_not_found", "This QR code is unavailable or has expired.");
    }

    const payload = parseDestinationPayload(qrCode.destinationType, qrCode.payload);
    scheduleQrScan(qrCode, request.headers);

    if (qrCode.destinationType === "URL") {
      if (!("url" in payload)) {
        throw new ApiError(500, "invalid_qr_payload", "The stored destination payload is invalid.");
      }
      return new Response(null, {
        status: 302,
        headers: {
          Location: payload.url,
          "Cache-Control": "private, no-store",
        },
      });
    }

    if (qrCode.destinationType === "PDF") {
      if (!("fileUrl" in payload)) {
        throw new ApiError(500, "invalid_qr_payload", "The stored destination payload is invalid.");
      }
      return new Response(null, {
        status: 302,
        headers: {
          Location: payload.fileUrl,
          "Cache-Control": "private, no-store",
        },
      });
    }

    return Response.json(
      {
        data: {
          qrCode: {
            id: qrCode.id,
            shortCode: qrCode.shortCode,
            title: qrCode.title,
            destinationType: qrCode.destinationType,
          },
          payload,
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
