import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import { requireTenantContext } from "@/lib/auth/tenant-context";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const allowedTypes = {
  "image/png": { extension: "png" },
  "image/jpeg": { extension: "jpg" },
  "image/webp": { extension: "webp" },
} as const;

function tenantStorageSegment(organizationId: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(organizationId)) {
    throw new ApiError(500, "storage_key_unavailable", "Could not create a safe tenant storage key.");
  }
  return organizationId;
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request);
    
    // Supabase client በ Service Role Key በመጠቀም (በሰርቨር በኩል ፋይል ለመጫን)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new ApiError(503, "storage_not_configured", "Storage credentials are not configured.");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new ApiError(400, "invalid_multipart", "Provide a multipart form with an image file.");
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new ApiError(400, "file_required", "Choose a PNG, JPEG, or WebP logo file.");
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      throw new ApiError(400, "invalid_file_size", "Logo files must be no larger than 2 MiB.");
    }

    const type = file.type.toLowerCase() as keyof typeof allowedTypes;
    const spec = allowedTypes[type];
    if (!spec) {
      throw new ApiError(400, "unsupported_file_type", "Logo files must be PNG, JPEG, or WebP.");
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const key = `faidatech/${tenantStorageSegment(tenant.organizationId)}/logos/${randomUUID()}.${spec.extension}`;

    // ፋይሉን በቀጥታ ወደ Supabase Storage (assets bucket) መስቀል
    const { error: uploadError } = await supabase.storage
      .from("assets")
      .upload(key, fileBuffer, {
        contentType: type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase storage upload error:", uploadError);
      throw new ApiError(502, "storage_upload_failed", "The logo could not be saved. Please try again.");
    }

    // የሕዝብ (Public) ዩአርኤል ማግኘት
    const { data: publicUrlData } = supabase.storage.from("assets").getPublicUrl(key);

    return Response.json(
      { data: { url: publicUrlData.publicUrl, key } },
      { status: 201, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}