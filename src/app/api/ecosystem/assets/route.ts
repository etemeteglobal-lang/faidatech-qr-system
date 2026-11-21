import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { apiErrorResponse, ApiError, readJsonBody } from "@/lib/api/errors";
import { requireOrganizationAdmin, requireTenantContext } from "@/lib/auth/tenant-context";
import { ensurePostgresConfigured, prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const inputSchema = z.object({ assetTag: z.string().trim().min(1).max(100), name: z.string().trim().min(1).max(180), assetType: z.string().trim().min(1).max(80), location: z.string().trim().max(180).optional().nullable(), manualUrl: z.string().url().max(2000).optional().nullable(), parts: z.array(z.record(z.string(), z.unknown())).max(100).default([]), metadata: z.record(z.string(), z.unknown()).default({}) });

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request);
    if (tenant.role === "AGENT") throw new ApiError(403, "forbidden", "Asset register is not in the agent data scope.");
    ensurePostgresConfigured();
    const assets = await prisma.maintainedAsset.findMany({ where: { organizationId: tenant.organizationId }, orderBy: { updatedAt: "desc" }, take: 100, include: { _count: { select: { maintenanceRecords: true } } } });
    return Response.json({ data: assets }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiErrorResponse(error); }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request);
    requireOrganizationAdmin(tenant);
    const parsed = inputSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) return Response.json({ error: { code: "validation_error", issues: parsed.error.issues } }, { status: 400 });
    if (parsed.data.manualUrl && new URL(parsed.data.manualUrl).protocol !== "https:") throw new ApiError(400, "invalid_manual_url", "Manual links must use HTTPS.");
    ensurePostgresConfigured();
    const asset = await prisma.maintainedAsset.create({ data: { organizationId: tenant.organizationId, assetTag: parsed.data.assetTag, name: parsed.data.name, assetType: parsed.data.assetType, location: parsed.data.location ?? null, manualUrl: parsed.data.manualUrl ?? null, parts: parsed.data.parts as Prisma.InputJsonArray, metadata: parsed.data.metadata as Prisma.InputJsonObject }, select: { id: true, assetTag: true, name: true, assetType: true, location: true, manualUrl: true, createdAt: true } });
    return Response.json({ data: asset }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiErrorResponse(error); }
}
