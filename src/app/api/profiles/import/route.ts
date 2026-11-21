import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { apiErrorResponse, ApiError } from "@/lib/api/errors";
import { requireTenantContext } from "@/lib/auth/tenant-context";
import { ensurePostgresConfigured, prisma } from "@/lib/prisma";
import { parseCsv } from "@/lib/templates/csv";
import { getTemplate, validateProfileSubmission, type ProfileSubmission } from "@/lib/templates/registry";

export const runtime = "nodejs";

function slugify(name: string) {
  const value = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "profile";
  return `${value}-${randomBytes(3).toString("hex")}`;
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request);
    if (tenant.role === "AGENT") throw new ApiError(403, "forbidden", "Field agents cannot bulk import organization profiles.");
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("text/csv")) throw new ApiError(415, "unsupported_media_type", "Send a text/csv request body.");
    const table = parseCsv(await request.text());
    if (!table.rows.length) throw new ApiError(400, "empty_csv", "CSV must include a header and at least one data row.");
    const validRows: ProfileSubmission[] = [];
    const errors: Array<{ row: number; message: string }> = [];
    for (let index = 0; index < table.rows.length; index += 1) {
      const row = Object.fromEntries(table.headers.map((key, column) => [key, table.rows[index][column]]));
      try {
        const profileData = row.profileDataJson ? JSON.parse(String(row.profileDataJson)) : {};
        const customFields = row.customFieldsJson ? JSON.parse(String(row.customFieldsJson)) : {};
        const candidate = { sector: row.sector, profileKind: row.profileKind || "ORGANIZATION", displayName: row.displayName, profileData, customFields };
        const checked = validateProfileSubmission(candidate);
        if (!checked.success) throw new Error("Invalid sector, profile kind, display name, or profile JSON.");
        if (!getTemplate(checked.data.sector)) throw new Error("Unknown sector.");
        validRows.push(checked.data);
      } catch (error) {
        errors.push({ row: index + 2, message: error instanceof Error ? error.message : "Invalid row." });
      }
    }
    if (validRows.length) {
      ensurePostgresConfigured();
      await prisma.$transaction(async (tx) => {
        await tx.businessProfile.createMany({ data: validRows.map((data) => ({
          organizationId: tenant.organizationId,
          createdByUserId: tenant.userId,
          sector: data.sector,
          profileKind: data.profileKind,
          displayName: data.displayName,
          slug: slugify(data.displayName),
          approvalStatus: "DRAFT",
          profileData: data.profileData as Prisma.InputJsonObject,
          customFields: data.customFields as Prisma.InputJsonObject,
        })) });
        await tx.ecosystemAuditLog.create({ data: { organizationId: tenant.organizationId, actorUserId: tenant.userId, action: "PROFILE_CSV_IMPORTED", entityType: "BusinessProfile", entityId: "bulk", details: { createdCount: validRows.length, rejectedCount: errors.length } } });
      });
    }
    return Response.json({ data: { createdCount: validRows.length, rejectedCount: errors.length, errors } }, { status: errors.length ? 207 : 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiErrorResponse(error); }
}
