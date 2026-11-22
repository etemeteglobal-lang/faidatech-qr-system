import { NextRequest } from "next/server";
import { z } from "zod";
import { apiErrorResponse, ApiError, readJsonBody } from "@/lib/api/errors";
import { requireOrganizationAdmin, requireTenantContext } from "@/lib/auth/tenant-context";
import { ensurePostgresConfigured, prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const statusSchema = z.object({ status: z.enum(["READ", "RESOLVED"]) }).strict();

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request);
    requireOrganizationAdmin(tenant);
    const { id } = await context.params;
    ensurePostgresConfigured();
    const service = await prisma.sharedService.findFirst({ where: { id, organizationId: tenant.organizationId }, select: { id: true } });
    if (!service) throw new ApiError(404, "not_found", "Service not found.");
    const responses = await prisma.serviceResponse.findMany({
      where: { sharedServiceId: service.id, organizationId: tenant.organizationId },
      orderBy: { submittedAt: "desc" },
      take: 100,
      select: { id: true, visitorName: true, visitorEmail: true, visitorPhone: true, message: true, status: true, submittedAt: true },
    });
    return Response.json({ data: responses }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiErrorResponse(error); }
}

export async function PATCH(request: NextRequest, context: Context): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request);
    requireOrganizationAdmin(tenant);
    const { id } = await context.params;
    const parsed = statusSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) return Response.json({ error: { code: "validation_error" } }, { status: 400 });
    ensurePostgresConfigured();
    const existing = await prisma.serviceResponse.findFirst({ where: { id, organizationId: tenant.organizationId }, select: { id: true } });
    if (!existing) throw new ApiError(404, "not_found", "Response not found.");
    const updated = await prisma.serviceResponse.update({ where: { id }, data: { status: parsed.data.status }, select: { id: true, status: true } });
    await prisma.ecosystemAuditLog.create({ data: { organizationId: tenant.organizationId, actorUserId: tenant.userId, action: `SERVICE_RESPONSE_${parsed.data.status}`, entityType: "ServiceResponse", entityId: id, details: {} } });
    return Response.json({ data: updated }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiErrorResponse(error); }
}
