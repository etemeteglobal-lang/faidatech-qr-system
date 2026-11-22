import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import { rateLimit } from "@/lib/api/rate-limit";
import { requireTenantContext } from "@/lib/auth/tenant-context";
import { getBillingSnapshot } from "@/lib/billing/entitlements";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_MULTIPART_SIZE = MAX_FILE_SIZE + 512 * 1024;
const ALLOWED_TYPES = {
  "application/pdf": { extension: "pdf" },
  "image/png": { extension: "png" },
  "image/jpeg": { extension: "jpg" },
  "image/webp": { extension: "webp" },
} as const;

type AllowedType = keyof typeof ALLOWED_TYPES;

function hasExpectedSignature(buffer: Buffer, type: AllowedType): boolean {
  if (type === "application/pdf") {
    return buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  }
  if (type === "image/png") {
    return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (type === "image/jpeg") {
    return buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  }
  return buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
}

function safeOrganizationSegment(organizationId: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(organizationId)) {
    throw new ApiError(500, "storage_key_unavailable", "Could not create a safe tenant storage key.");
  }
  return organizationId;
}

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request);
    const snapshot = await getBillingSnapshot(tenant.organizationId);
    if (!snapshot?.quota) throw new ApiError(503, "storage_quota_unavailable", "Storage quota information is temporarily unavailable.");
    return Response.json({ data: { planName: snapshot.plan.name, storageBytesUsed: snapshot.quota.storageBytesUsed.toString(), storageBytesLimit: snapshot.quota.storageBytesLimit.toString() } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiErrorResponse(error); }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request);
    if (!rateLimit(`profile-assets-upload:${tenant.organizationId}`, 20, 60_000)) {
      throw new ApiError(429, "rate_limited", "Too many uploads. Please try again shortly.");
    }

    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_MULTIPART_SIZE) {
      throw new ApiError(413, "request_too_large", "The upload request exceeds the 10 MiB file limit.");
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new ApiError(400, "invalid_multipart", "Provide a multipart form with one PDF, PNG, JPEG, or WebP file.");
    }

    const purpose = form.get("purpose");
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new ApiError(400, "file_required", "Choose a PDF, PNG, JPEG, or WebP file.");
    }
    if (file.size <= 0 || file.size > (purpose === "logo" ? 2 * 1024 * 1024 : MAX_FILE_SIZE)) {
      throw new ApiError(400, "invalid_file_size", "Files must be larger than zero and no larger than 10 MiB.");
    }

    const contentType = file.type.toLowerCase() as AllowedType;
    if (purpose === "logo" && !["image/png", "image/jpeg", "image/webp"].includes(contentType)) {
      throw new ApiError(400, "unsupported_file_type", "Logos must be PNG, JPEG, or WebP images.");
    }
    const spec = ALLOWED_TYPES[contentType];
    if (!spec) {
      throw new ApiError(400, "unsupported_file_type", "Only PDF, PNG, JPEG, and WebP files are allowed.");
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    if (!hasExpectedSignature(fileBuffer, contentType)) {
      throw new ApiError(400, "invalid_file_signature", "The uploaded file content does not match its declared type.");
    }

    let snapshot;
    try {
      snapshot = await getBillingSnapshot(tenant.organizationId);
    } catch {
      throw new ApiError(503, "storage_quota_unavailable", "Storage quota information is temporarily unavailable.");
    }
    if (!snapshot?.quota) {
      throw new ApiError(503, "storage_quota_unavailable", "Storage quota information is unavailable; upload cannot proceed.");
    }

    const organizationSegment = safeOrganizationSegment(tenant.organizationId);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      throw new ApiError(503, "storage_not_configured", "Storage credentials are not configured.");
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { quota } = snapshot;
    const sizeBytes = BigInt(fileBuffer.byteLength);
    const storageLimitBytes = quota.storageBytesLimit;
    if (sizeBytes > storageLimitBytes) {
      throw new ApiError(402, "storage_quota_exceeded", "This file exceeds the available organization storage quota.");
    }

    const reservation = await prisma.planQuota.updateMany({
      where: {
        organizationId: tenant.organizationId,
        planId: snapshot.plan.id,
        storageBytesUsed: { lte: storageLimitBytes - sizeBytes },
      },
      data: { storageBytesUsed: { increment: sizeBytes } },
    });
    if (reservation.count !== 1) {
      throw new ApiError(402, "storage_quota_exceeded", "Your organization has reached its storage quota.");
    }

    const key = `faidatech/${organizationSegment}/profile-assets/${randomUUID()}.${spec.extension}`;
    let uploadError;
    try {
      const result = await supabase.storage.from("assets").upload(key, fileBuffer, {
        contentType,
        upsert: false,
      });
      uploadError = result.error;
    } catch (storageError) {
      console.error("Supabase profile asset upload error:", storageError);
      try {
        await prisma.planQuota.updateMany({
          where: { organizationId: tenant.organizationId, planId: snapshot.plan.id, storageBytesUsed: { gte: sizeBytes } },
          data: { storageBytesUsed: { decrement: sizeBytes } },
        });
      } catch (compensationError) {
        console.error("Profile asset quota reservation compensation failed:", compensationError);
      }
      throw new ApiError(502, "storage_upload_failed", "The file could not be saved. Please try again.");
    }

    if (uploadError) {
      console.error("Supabase profile asset upload error:", uploadError);
      try {
        await prisma.planQuota.updateMany({
          where: { organizationId: tenant.organizationId, planId: snapshot.plan.id, storageBytesUsed: { gte: sizeBytes } },
          data: { storageBytesUsed: { decrement: sizeBytes } },
        });
      } catch (compensationError) {
        console.error("Profile asset quota reservation compensation failed:", compensationError);
      }
      throw new ApiError(502, "storage_upload_failed", "The file could not be saved. Please try again.");
    }

    const { data: publicUrlData } = supabase.storage.from("assets").getPublicUrl(key);
    const updatedQuota = await prisma.planQuota.findUnique({
      where: { organizationId_planId: { organizationId: tenant.organizationId, planId: snapshot.plan.id } },
      select: { storageBytesUsed: true, storageBytesLimit: true },
    });

    return Response.json({
      data: {
        url: publicUrlData.publicUrl,
        key,
        sizeBytes: fileBuffer.byteLength,
        contentType,
        storageUsedBytes: (updatedQuota?.storageBytesUsed ?? quota.storageBytesUsed + sizeBytes).toString(),
        storageLimitBytes: (updatedQuota?.storageBytesLimit ?? storageLimitBytes).toString(),
      },
    }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
