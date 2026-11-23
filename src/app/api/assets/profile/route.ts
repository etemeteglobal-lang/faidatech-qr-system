import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import { rateLimit } from "@/lib/api/rate-limit";
import { requireTenantContext } from "@/lib/auth/tenant-context";
import { assertStorageQuota, incrementStorageUsage } from "@/lib/billing/entitlements";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const allowedTypes = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/ogg": "ogv",
} as const;
type AllowedType = keyof typeof allowedTypes;

function safeTenantSegment(organizationId: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(organizationId)) throw new ApiError(500, "storage_key_unavailable", "Could not create a safe profile storage key.");
  return organizationId;
}

function hasExpectedSignature(buffer: Buffer, type: AllowedType): boolean {
  if (type === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (type === "image/jpeg") return buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  if (type === "image/webp") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  if (type === "application/pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (type === "video/mp4") return buffer.subarray(4, 8).toString("ascii") === "ftyp";
  if (type === "video/webm") return buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  return buffer.subarray(0, 4).toString("ascii") === "OggS";
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request);
    if (!rateLimit(`profile-upload:${tenant.organizationId}`, 30, 60_000)) {
      throw new ApiError(429, "rate_limited", "Too many uploads. Please try again shortly.");
    }
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) throw new ApiError(503, "storage_not_configured", "Profile storage is not configured yet. An administrator must connect secure storage before uploading files.");

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new ApiError(400, "invalid_multipart", "Provide a profile file to upload.");
    }
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "file_required", "Choose an image, document, or short video file.");
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) throw new ApiError(400, "invalid_file_size", "Profile files and videos must be no larger than 10 MiB.");
    const type = file.type.toLowerCase() as AllowedType;
    if (!allowedTypes[type]) throw new ApiError(400, "unsupported_file_type", "Profile files must be PNG, JPEG, WebP, PDF, MP4, WebM, or OGG video.");
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!hasExpectedSignature(buffer, type)) throw new ApiError(400, "invalid_file_signature", "The uploaded file content does not match its declared type.");
    await assertStorageQuota(tenant.organizationId, buffer.byteLength);

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const key = `faidatech/${safeTenantSegment(tenant.organizationId)}/profiles/${randomUUID()}.${allowedTypes[type]}`;
    const { error } = await supabase.storage.from("assets").upload(key, buffer, { contentType: type, upsert: false });
    if (error) throw new ApiError(502, "storage_upload_failed", "The profile file could not be saved. Please try again.");
    await incrementStorageUsage(tenant.organizationId, buffer.byteLength);
    const { data } = supabase.storage.from("assets").getPublicUrl(key);
    return Response.json({ data: { url: data.publicUrl, key, fileName: file.name.slice(0, 255), mimeType: type, fileSizeBytes: buffer.byteLength } }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
