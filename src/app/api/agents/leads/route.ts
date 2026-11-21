import { NextRequest } from "next/server";
import { z } from "zod";
import { apiErrorResponse, ApiError, readJsonBody } from "@/lib/api/errors";
import { requireOrganizationAdmin, requireTenantContext } from "@/lib/auth/tenant-context";
import { ensurePostgresConfigured, prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const leadInput = z.object({ agentId: z.string().optional(), customerName: z.string().trim().min(1).max(160), email: z.string().email().max(254).optional().nullable(), phone: z.string().trim().max(40).optional().nullable(), businessName: z.string().trim().max(180).optional().nullable(), notes: z.string().trim().max(1000).optional().nullable() });

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request, { allowAgent: true });
    ensurePostgresConfigured();
    const agent = tenant.role === "AGENT" ? await prisma.fieldAgent.findFirst({ where: { userId: tenant.userId, organizationId: tenant.organizationId, active: true }, select: { id: true } }) : null;
    if (tenant.role === "AGENT" && !agent) throw new ApiError(403, "agent_not_configured", "Your agent profile is not active.");
    if (tenant.role !== "AGENT") requireOrganizationAdmin(tenant);
    const leads = await prisma.agentLead.findMany({ where: { organizationId: tenant.organizationId, ...(agent ? { agentId: agent.id } : {}) }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, customerName: true, email: true, phone: true, businessName: true, status: true, commissionBaseMinor: true, commissionAmountMinor: true, commissionCurrency: true, payoutStatus: true, createdAt: true, agent: { select: { id: true, referralCode: true, user: { select: { name: true } } } } } });
    return Response.json({ data: leads }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiErrorResponse(error); }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request, { allowAgent: true });
    const parsed = leadInput.safeParse(await readJsonBody(request));
    if (!parsed.success) return Response.json({ error: { code: "validation_error", issues: parsed.error.issues } }, { status: 400 });
    ensurePostgresConfigured();
    let agentId = parsed.data.agentId;
    if (tenant.role === "AGENT") {
      const agent = await prisma.fieldAgent.findFirst({ where: { userId: tenant.userId, organizationId: tenant.organizationId, active: true }, select: { id: true } });
      if (!agent) throw new ApiError(403, "agent_not_configured", "Your agent profile is not active.");
      agentId = agent.id;
    } else {
      requireOrganizationAdmin(tenant);
      if (!agentId) throw new ApiError(400, "agent_required", "Choose an organization agent for this referral.");
    }
    const assigned = await prisma.fieldAgent.findFirst({ where: { id: agentId, organizationId: tenant.organizationId, active: true }, select: { id: true } });
    if (!assigned) throw new ApiError(404, "agent_not_found", "Active agent not found in this organization.");
    const lead = await prisma.agentLead.create({ data: { organizationId: tenant.organizationId, agentId: assigned.id, customerName: parsed.data.customerName, email: parsed.data.email ?? null, phone: parsed.data.phone ?? null, businessName: parsed.data.businessName ?? null, notes: parsed.data.notes ?? null }, select: { id: true, customerName: true, status: true, createdAt: true } });
    await prisma.ecosystemAuditLog.create({ data: { organizationId: tenant.organizationId, actorUserId: tenant.userId, action: "AGENT_LEAD_CREATED", entityType: "AgentLead", entityId: lead.id, details: { agentId: assigned.id } } });
    return Response.json({ data: lead }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiErrorResponse(error); }
}
