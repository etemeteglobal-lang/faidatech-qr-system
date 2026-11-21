import { NextRequest } from "next/server";
import { z } from "zod";
import { apiErrorResponse, ApiError, readJsonBody } from "@/lib/api/errors";
import { requireOrganizationAdmin, requireTenantContext } from "@/lib/auth/tenant-context";
import { calculateCommissionMinor } from "@/lib/agents/commission";
import { ensurePostgresConfigured, prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const leadPatch = z.object({ status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "ONBOARDING", "CONVERTED", "REJECTED"]).optional(), commissionBaseMinor: z.number().int().min(0).max(2_000_000_000).optional(), payoutStatus: z.enum(["PENDING", "APPROVED", "PAID", "HELD"]).optional() }).refine((value) => Object.keys(value).length > 0);

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request, { allowAgent: true });
    const { id } = await context.params;
    const parsed = leadPatch.safeParse(await readJsonBody(request));
    if (!parsed.success) return Response.json({ error: { code: "validation_error", issues: parsed.error.issues } }, { status: 400 });
    ensurePostgresConfigured();
    const scopedAgent = tenant.role === "AGENT" ? await prisma.fieldAgent.findFirst({ where: { userId: tenant.userId, organizationId: tenant.organizationId, active: true }, select: { id: true } }) : null;
    if (tenant.role === "AGENT" && !scopedAgent) throw new ApiError(403, "agent_not_configured", "Your agent profile is not active.");
    const current = await prisma.agentLead.findFirst({ where: { id, organizationId: tenant.organizationId, ...(scopedAgent ? { agentId: scopedAgent.id } : {}) }, include: { agent: { select: { commissionRateBps: true } } } });
    if (!current) throw new ApiError(404, "not_found", "Lead not found in your permitted scope.");
    let commissionBaseMinor = current.commissionBaseMinor;
    let commissionAmountMinor = current.commissionAmountMinor;
    let payoutStatus = parsed.data.payoutStatus;
    if (tenant.role === "AGENT") {
      if (parsed.data.commissionBaseMinor !== undefined || parsed.data.payoutStatus !== undefined || parsed.data.status === "CONVERTED" || parsed.data.status === "REJECTED") throw new ApiError(403, "forbidden", "Agents can update contact progress only; admins control conversion, commission and payout.");
      if (parsed.data.status && !["NEW", "CONTACTED", "QUALIFIED", "ONBOARDING"].includes(parsed.data.status)) throw new ApiError(403, "forbidden", "Agents can set contact-progress states only.");
    } else {
      requireOrganizationAdmin(tenant);
      if (parsed.data.commissionBaseMinor !== undefined) commissionBaseMinor = parsed.data.commissionBaseMinor;
      if (parsed.data.status === "CONVERTED" || parsed.data.commissionBaseMinor !== undefined) {
        commissionAmountMinor = calculateCommissionMinor(commissionBaseMinor, current.agent.commissionRateBps);
        payoutStatus = parsed.data.payoutStatus ?? "PENDING";
      }
    }
    const updated = await prisma.agentLead.update({ where: { id }, data: { status: parsed.data.status, commissionBaseMinor: tenant.role === "AGENT" ? undefined : commissionBaseMinor, commissionAmountMinor: tenant.role === "AGENT" ? undefined : commissionAmountMinor, payoutStatus: tenant.role === "AGENT" ? undefined : payoutStatus }, select: { id: true, status: true, commissionBaseMinor: true, commissionAmountMinor: true, payoutStatus: true } });
    await prisma.ecosystemAuditLog.create({ data: { organizationId: tenant.organizationId, actorUserId: tenant.userId, action: "AGENT_LEAD_UPDATED", entityType: "AgentLead", entityId: id, details: { status: updated.status, payoutStatus: updated.payoutStatus } } });
    return Response.json({ data: updated }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiErrorResponse(error); }
}
