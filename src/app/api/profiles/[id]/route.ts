import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { apiErrorResponse, ApiError, readJsonBody } from "@/lib/api/errors";
import { requireOrganizationAdmin, requireTenantContext } from "@/lib/auth/tenant-context";
import { ensurePostgresConfigured, prisma } from "@/lib/prisma";
import { validateProfileSubmission } from "@/lib/templates/registry";
import { getBillingSnapshot } from "@/lib/billing/entitlements";
import { cleanupUnreferencedTenantAssets, collectTenantAssetUrls, reconcileTenantStorageUsage } from "@/lib/storage/tenant-assets";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request);
    const { id } = await context.params;
    const validation = validateProfileSubmission(await readJsonBody(request));
    if (!validation.success) return Response.json({ error: { code: "validation_error", issues: validation.error } }, { status: 400 });
    ensurePostgresConfigured();
    const current = await prisma.businessProfile.findFirst({ where: { id, organizationId: tenant.organizationId }, select: { id: true, createdByUserId: true, approvalStatus: true, profileData: true, customFields: true } });
    if (!current) throw new ApiError(404, "not_found", "Profile not found in this organization.");
    const isAdmin = tenant.role === "OWNER" || tenant.role === "ADMIN";
    if (!isAdmin && current.createdByUserId !== tenant.userId) throw new ApiError(403, "forbidden", "Members may edit only profiles they created.");
    if (current.approvalStatus !== "DRAFT" && current.approvalStatus !== "REJECTED") throw new ApiError(409, "profile_locked", "Only draft or rejected profiles can be edited; submitted and approved profiles are locked.");
    const data = validation.data;
    const updated = await prisma.$transaction(async (tx) => {
      // Keep the public path stable so printed QR codes, shared links, and vCards
      // continue to resolve after an approved profile is edited.
      const profile = await tx.businessProfile.update({ where: { id }, data: { sector: data.sector, profileKind: data.profileKind, displayName: data.displayName, profileData: data.profileData as Prisma.InputJsonObject, customFields: data.customFields as Prisma.InputJsonObject }, select: { id: true, sector: true, profileKind: true, displayName: true, slug: true, approvalStatus: true, profileData: true, customFields: true } });
      await tx.ecosystemAuditLog.create({ data: { organizationId: tenant.organizationId, actorUserId: tenant.userId, action: "PROFILE_UPDATED", entityType: "BusinessProfile", entityId: id, details: { sector: data.sector } } });
      return profile;
    });
    const previousAssets = collectTenantAssetUrls([current.profileData, current.customFields], tenant.organizationId);
    const nextAssets = collectTenantAssetUrls([updated.profileData, updated.customFields], tenant.organizationId);
    const replacedAssets = [...previousAssets].filter((url) => !nextAssets.has(url));
    if (replacedAssets.length) {
      try {
        await cleanupUnreferencedTenantAssets(tenant.organizationId, replacedAssets);
        const snapshot = await getBillingSnapshot(tenant.organizationId);
        if (snapshot?.quota) await reconcileTenantStorageUsage(tenant.organizationId, snapshot.plan.id);
      } catch (cleanupError) {
        console.error("Replaced profile asset cleanup or storage synchronization failed:", cleanupError);
      }
    }
    return Response.json({ data: updated }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && (error.code === "P2021" || error.code === "P2022")) {
      return Response.json({ error: { code: "profiles_storage_unavailable" } }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
    }
    return apiErrorResponse(error);
  }
}
