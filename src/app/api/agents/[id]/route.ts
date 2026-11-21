import { NextRequest } from "next/server";
import { z } from "zod";
import { apiErrorResponse, ApiError, readJsonBody } from "@/lib/api/errors";
import { requireOrganizationAdmin, requireTenantContext } from "@/lib/auth/tenant-context";
import { ensurePostgresConfigured, prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const patchSchema = z.object({ commissionRateBps: z.number().int().min(0).max(10_000).optional(), commissionCurrency: z.string().regex(/^[A-Z]{3}$/).optional(), active: z.boolean().optional(), payoutNotes: z.string().trim().max(500).nullable().optional() }).refine((value) => Object.keys(value).length > 0);

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request);
    requireOrganizationAdmin(tenant);
    const { id } = await context.params;
    const parsed = patchSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) return Response.json({ error: { code: "validation_error", issues: parsed.error.issues } }, { status: 400 });
    ensurePostgresConfigured();
    const current = await prisma.fieldAgent.findFirst({ where: { id, organizationId: tenant.organizationId }, select: { id: true } });
    if (!current) throw new ApiError(404, "not_found", "Agent not found.");
    const agent = await prisma.fieldAgent.update({ where: { id }, data: parsed.data, select: { id: true, referralCode: true, commissionRateBps: true, commissionCurrency: true, active: true, payoutNotes: true } });
    await prisma.ecosystemAuditLog.create({ data: { organizationId: tenant.organizationId, actorUserId: tenant.userId, action: "AGENT_UPDATED", entityType: "FieldAgent", entityId: id, details: parsed.data } });
    return Response.json({ data: agent }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiErrorResponse(error); }
}
