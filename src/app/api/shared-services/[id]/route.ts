import { NextRequest } from "next/server";
import { z } from "zod";
import { apiErrorResponse, ApiError, readJsonBody } from "@/lib/api/errors";
import { requireOrganizationAdmin, requireTenantContext } from "@/lib/auth/tenant-context";
import { ensurePostgresConfigured, prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const patchSchema = z.object({ published: z.boolean(), cacheTtlSeconds: z.number().int().min(0).max(300).optional() });

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request);
    requireOrganizationAdmin(tenant);
    const { id } = await context.params;
    const parsed = patchSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) return Response.json({ error: { code: "validation_error", issues: parsed.error.issues } }, { status: 400 });
    ensurePostgresConfigured();
    const existing = await prisma.sharedService.findFirst({ where: { id, organizationId: tenant.organizationId }, select: { id: true } });
    if (!existing) throw new ApiError(404, "not_found", "Shared service not found.");
    const updated = await prisma.sharedService.update({ where: { id }, data: { published: parsed.data.published, cacheTtlSeconds: parsed.data.cacheTtlSeconds, publishedAt: parsed.data.published ? new Date() : null }, select: { id: true, slug: true, title: true, published: true, cacheTtlSeconds: true, publishedAt: true } });
    await prisma.ecosystemAuditLog.create({ data: { organizationId: tenant.organizationId, actorUserId: tenant.userId, action: parsed.data.published ? "SHARED_SERVICE_PUBLISHED" : "SHARED_SERVICE_UNPUBLISHED", entityType: "SharedService", entityId: id, details: { cacheTtlSeconds: updated.cacheTtlSeconds } } });
    return Response.json({ data: updated }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiErrorResponse(error); }
}
