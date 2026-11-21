import { NextRequest } from "next/server";
import { apiErrorResponse, ApiError } from "@/lib/api/errors";
import { requireTenantContext } from "@/lib/auth/tenant-context";
import { ensurePostgresConfigured, prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request, { allowAgent: true });
    ensurePostgresConfigured();
    if (tenant.role === "AGENT") {
      const agent = await prisma.fieldAgent.findFirst({ where: { userId: tenant.userId, organizationId: tenant.organizationId, active: true }, select: { id: true, referralCode: true, commissionRateBps: true, commissionCurrency: true, _count: { select: { leads: true, payouts: true } } } });
      if (!agent) throw new ApiError(403, "agent_not_configured", "Your agent profile is not active.");
      const [leads, payouts] = await Promise.all([
        prisma.agentLead.findMany({ where: { organizationId: tenant.organizationId, agentId: agent.id }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, customerName: true, businessName: true, status: true, commissionAmountMinor: true, commissionCurrency: true, payoutStatus: true, createdAt: true } }),
        prisma.agentLead.aggregate({ where: { organizationId: tenant.organizationId, agentId: agent.id }, _sum: { commissionAmountMinor: true }, _count: true }),
      ]);
      return Response.json({ data: { mode: "agent", agent, leads, totals: { leads: agent._count.leads, commissionMinor: payouts._sum.commissionAmountMinor ?? 0 } } }, { headers: { "Cache-Control": "private, no-store" } });
    }
    if (tenant.role !== "OWNER" && tenant.role !== "ADMIN") throw new ApiError(403, "forbidden", "Agent management is available to organization admins.");
    const [agents, leadCount, pendingPayoutMinor] = await Promise.all([
      prisma.fieldAgent.findMany({ where: { organizationId: tenant.organizationId }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, referralCode: true, commissionRateBps: true, commissionCurrency: true, active: true, user: { select: { id: true, name: true, email: true } }, _count: { select: { leads: true, payouts: true } } } }),
      prisma.agentLead.count({ where: { organizationId: tenant.organizationId } }),
      prisma.agentLead.aggregate({ where: { organizationId: tenant.organizationId, payoutStatus: "PENDING" }, _sum: { commissionAmountMinor: true } }),
    ]);
    return Response.json({ data: { mode: "admin", agents, totals: { agents: agents.length, leads: leadCount, pendingPayoutMinor: pendingPayoutMinor._sum.commissionAmountMinor ?? 0 } } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiErrorResponse(error); }
}
