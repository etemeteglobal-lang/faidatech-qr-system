import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { apiErrorResponse, ApiError, readJsonBody } from "@/lib/api/errors";
import { requireTenantContext } from "@/lib/auth/tenant-context";
import { ensurePostgresConfigured, prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const inputSchema = z.object({ assetTag: z.string().trim().min(1).max(100), recordType: z.enum(["INSPECTION", "MAINTENANCE", "FAULT", "PART_REPLACEMENT"]), title: z.string().trim().min(1).max(180), details: z.record(z.string(), z.unknown()).default({}), faultReported: z.boolean().default(false) });

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request, { allowAgent: true });
    ensurePostgresConfigured();
    const agent = tenant.role === "AGENT" ? await prisma.fieldAgent.findFirst({ where: { userId: tenant.userId, organizationId: tenant.organizationId, active: true }, select: { id: true } }) : null;
    if (tenant.role === "AGENT" && !agent) throw new ApiError(403, "agent_not_configured", "Your agent profile is not active.");
    const records = await prisma.maintenanceRecord.findMany({ where: { organizationId: tenant.organizationId, ...(agent ? { fieldAgentId: agent.id } : {}) }, orderBy: { performedAt: "desc" }, take: 100, include: { asset: { select: { assetTag: true, name: true, assetType: true } } } });
    return Response.json({ data: records }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiErrorResponse(error); }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request, { allowAgent: true });
    const parsed = inputSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) return Response.json({ error: { code: "validation_error", issues: parsed.error.issues } }, { status: 400 });
    ensurePostgresConfigured();
    const agent = tenant.role === "AGENT" ? await prisma.fieldAgent.findFirst({ where: { userId: tenant.userId, organizationId: tenant.organizationId, active: true }, select: { id: true } }) : null;
    if (tenant.role === "AGENT" && !agent) throw new ApiError(403, "agent_not_configured", "Your agent profile is not active.");
    const asset = await prisma.maintainedAsset.findFirst({ where: { assetTag: parsed.data.assetTag, organizationId: tenant.organizationId, active: true }, select: { id: true } });
    if (!asset) throw new ApiError(404, "asset_not_found", "Active asset not found in this organization.");
    const record = await prisma.maintenanceRecord.create({ data: { organizationId: tenant.organizationId, assetId: asset.id, actorUserId: tenant.userId, fieldAgentId: agent?.id ?? null, recordType: parsed.data.recordType, title: parsed.data.title, details: parsed.data.details as Prisma.InputJsonObject, faultReported: parsed.data.faultReported }, select: { id: true, assetId: true, recordType: true, title: true, faultReported: true, performedAt: true } });
    await prisma.ecosystemAuditLog.create({ data: { organizationId: tenant.organizationId, actorUserId: tenant.userId, action: parsed.data.faultReported ? "ASSET_FAULT_REPORTED" : "MAINTENANCE_RECORDED", entityType: "MaintenanceRecord", entityId: record.id, details: { assetId: asset.id, agentId: agent?.id ?? null } } });
    return Response.json({ data: record }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiErrorResponse(error); }
}
