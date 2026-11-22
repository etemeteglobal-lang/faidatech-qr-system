import { NextRequest } from "next/server";
import { z } from "zod";
import { apiErrorResponse, ApiError, readJsonBody } from "@/lib/api/errors";
import { requireOrganizationAdmin, requireTenantContext } from "@/lib/auth/tenant-context";
import { ensurePostgresConfigured, prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const statusSchema = z.object({ status: z.enum(["READ", "RESOLVED"]) }).strict();

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string; responseId: string }> }): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request);
    requireOrganizationAdmin(tenant);
    const { id, responseId } = await context.params;
    const parsed = statusSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) return Response.json({ error: { code: "validation_error" } }, { status: 400, headers: { "Cache-Control": "private, no-store" } });
    ensurePostgresConfigured();
    const existing = await prisma.serviceResponse.findFirst({ where: { id: responseId, sharedServiceId: id, organizationId: tenant.organizationId }, select: { id: true } });
    if (!existing) throw new ApiError(404, "not_found", "Response not found.");
    const updated = await prisma.serviceResponse.update({ where: { id: responseId }, data: { status: parsed.data.status }, select: { id: true, status: true } });
    await prisma.ecosystemAuditLog.create({ data: { organizationId: tenant.organizationId, actorUserId: tenant.userId, action: `SERVICE_RESPONSE_${parsed.data.status}`, entityType: "ServiceResponse", entityId: responseId, details: {} } });
    return Response.json({ data: updated }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiErrorResponse(error); }
}
