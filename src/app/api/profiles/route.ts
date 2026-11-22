import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { apiErrorResponse, readJsonBody, ApiError } from "@/lib/api/errors";
import { requireTenantContext } from "@/lib/auth/tenant-context";
import { ensurePostgresConfigured, prisma } from "@/lib/prisma";
import { getTemplate, validateProfileSubmission } from "@/lib/templates/registry";

export const runtime = "nodejs";

function makeSlug(value: string) {
  const base = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "profile";
  return `${base}-${randomBytes(3).toString("hex")}`;
}

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request);
    if (tenant.role === "AGENT") throw new ApiError(403, "forbidden", "Field agents use the agent portal for assigned onboarding records.");
    ensurePostgresConfigured();
    const params = request.nextUrl.searchParams;
    const take = Math.min(100, Math.max(1, Number(params.get("limit")) || 50));
    const sectorValue = params.get("sector");
    const sector = sectorValue ? getTemplate(sectorValue)?.code : undefined;
    if (sectorValue && !sector) throw new ApiError(400, "invalid_sector", "Choose one of the registered sector template codes.");
    const statusValue = params.get("status");
    const validStatuses = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED"] as const;
    const status = validStatuses.find((value) => value === statusValue);
    const profiles = await prisma.businessProfile.findMany({
      where: { organizationId: tenant.organizationId, ...(sector ? { sector } : {}), ...(status ? { approvalStatus: status } : {}) },
      orderBy: { updatedAt: "desc" }, take,
      select: { id: true, sector: true, profileKind: true, displayName: true, slug: true, approvalStatus: true, profileData: true, customFields: true, approvedAt: true, rejectionReason: true, createdAt: true, updatedAt: true },
    });
    return Response.json({ data: profiles }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && (error.code === "P2021" || error.code === "P2022")) {
      return Response.json({ error: { code: "profiles_storage_unavailable" } }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
    }
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request);
    if (tenant.role === "AGENT") throw new ApiError(403, "forbidden", "Field agents cannot create organization profiles directly.");
    const validation = validateProfileSubmission(await readJsonBody(request));
    if (!validation.success) return Response.json({ error: { code: "validation_error", issues: validation.error } }, { status: 400 });
    ensurePostgresConfigured();
    const data = validation.data;
    const profile = await prisma.businessProfile.create({
      data: {
        organizationId: tenant.organizationId,
        createdByUserId: tenant.userId,
        sector: data.sector,
        profileKind: data.profileKind,
        displayName: data.displayName,
        slug: makeSlug(data.displayName),
        profileData: data.profileData as Prisma.InputJsonObject,
        customFields: data.customFields as Prisma.InputJsonObject,
      },
      select: { id: true, slug: true, displayName: true, sector: true, approvalStatus: true, createdAt: true },
    });
    await prisma.ecosystemAuditLog.create({ data: { organizationId: tenant.organizationId, actorUserId: tenant.userId, action: "PROFILE_CREATED", entityType: "BusinessProfile", entityId: profile.id, details: { sector: data.sector } } });
    return Response.json({ data: profile }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiErrorResponse(error); }
}
