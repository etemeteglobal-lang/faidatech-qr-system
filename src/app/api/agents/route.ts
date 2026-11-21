import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { apiErrorResponse, ApiError, readJsonBody } from "@/lib/api/errors";
import { requireOrganizationAdmin, requireTenantContext } from "@/lib/auth/tenant-context";
import { ensurePostgresConfigured, prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const agentInput = z.object({ userId: z.string().min(1).max(64), commissionRateBps: z.number().int().min(0).max(10_000).default(0), commissionCurrency: z.string().regex(/^[A-Z]{3}$/).default("ETB") });

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request, { allowAgent: true });
    ensurePostgresConfigured();
    if (tenant.role === "AGENT") {
      const agent = await prisma.fieldAgent.findFirst({ where: { organizationId: tenant.organizationId, userId: tenant.userId }, select: { id: true, referralCode: true, active: true, commissionRateBps: true, commissionCurrency: true } });
      return Response.json({ data: agent }, { headers: { "Cache-Control": "private, no-store" } });
    }
    requireOrganizationAdmin(tenant);
    if (request.nextUrl.searchParams.get("eligible") === "1") {
      const members = await prisma.user.findMany({ where: { organizationId: tenant.organizationId, role: "MEMBER" }, orderBy: [{ name: "asc" }, { email: "asc" }], take: 200, select: { id: true, name: true, email: true } });
      return Response.json({ data: members }, { headers: { "Cache-Control": "private, no-store" } });
    }
    const agents = await prisma.fieldAgent.findMany({ where: { organizationId: tenant.organizationId }, orderBy: { createdAt: "desc" }, take: 100, include: { user: { select: { id: true, name: true, email: true } }, _count: { select: { leads: true, payouts: true } } } });
    return Response.json({ data: agents }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiErrorResponse(error); }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request);
    requireOrganizationAdmin(tenant);
    const parsed = agentInput.safeParse(await readJsonBody(request));
    if (!parsed.success) return Response.json({ error: { code: "validation_error", issues: parsed.error.issues } }, { status: 400 });
    ensurePostgresConfigured();
    const member = await prisma.user.findFirst({ where: { id: parsed.data.userId, organizationId: tenant.organizationId }, select: { id: true, role: true } });
    if (!member || member.role !== "MEMBER") throw new ApiError(400, "invalid_agent_user", "Select an existing organization member who is not already an owner, admin, or agent.");
    const referralCode = `FA-${randomBytes(5).toString("hex").toUpperCase()}`;
    const result = await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: member.id }, data: { role: "AGENT" } });
      const agent = await tx.fieldAgent.create({ data: { organizationId: tenant.organizationId, userId: member.id, referralCode, commissionRateBps: parsed.data.commissionRateBps, commissionCurrency: parsed.data.commissionCurrency }, select: { id: true, referralCode: true, commissionRateBps: true, commissionCurrency: true, active: true } });
      await tx.ecosystemAuditLog.create({ data: { organizationId: tenant.organizationId, actorUserId: tenant.userId, action: "AGENT_CREATED", entityType: "FieldAgent", entityId: agent.id, details: { userId: member.id, commissionRateBps: agent.commissionRateBps } } });
      return agent;
    });
    return Response.json({ data: result }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiErrorResponse(error); }
}
