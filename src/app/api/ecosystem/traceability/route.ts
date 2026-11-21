import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { apiErrorResponse, ApiError, readJsonBody } from "@/lib/api/errors";
import { requireOrganizationAdmin, requireTenantContext } from "@/lib/auth/tenant-context";
import { ensurePostgresConfigured, prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const productSchema = z.object({ kind: z.literal("PRODUCT"), productCode: z.string().trim().min(1).max(100), gtin: z.string().regex(/^\d{8,14}$/).optional().nullable(), digitalLink: z.string().url().max(500).optional().nullable(), name: z.string().trim().min(1).max(180), originMetadata: z.record(z.string(), z.unknown()).default({}), customFields: z.record(z.string(), z.unknown()).default({}) });
const batchSchema = z.object({ kind: z.literal("BATCH"), productId: z.string().min(1), batchCode: z.string().trim().min(1).max(100), serialRangeStart: z.string().max(100).optional().nullable(), serialRangeEnd: z.string().max(100).optional().nullable(), originMetadata: z.record(z.string(), z.unknown()).default({}), anomalyFlags: z.array(z.string().max(80)).max(32).default([]) });

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request);
    if (tenant.role === "AGENT") throw new ApiError(403, "forbidden", "Traceability records require organization membership outside the agent portal.");
    ensurePostgresConfigured();
    const products = await prisma.traceabilityProduct.findMany({ where: { organizationId: tenant.organizationId }, orderBy: { updatedAt: "desc" }, take: 100, include: { batches: { orderBy: { createdAt: "desc" }, take: 20, select: { id: true, batchCode: true, serialRangeStart: true, serialRangeEnd: true, anomalyFlags: true } }, scans: { orderBy: { scannedAt: "desc" }, take: 5, select: { id: true, anomalyFlags: true, scannedAt: true } } } });
    return Response.json({ data: products }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiErrorResponse(error); }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request);
    requireOrganizationAdmin(tenant);
    const input = await readJsonBody(request);
    const product = productSchema.safeParse(input);
    const batch = batchSchema.safeParse(input);
    if (!product.success && !batch.success) return Response.json({ error: { code: "validation_error", message: "Provide a valid PRODUCT or BATCH payload." } }, { status: 400 });
    ensurePostgresConfigured();
    if (product.success) {
      const data = await prisma.traceabilityProduct.create({ data: { organizationId: tenant.organizationId, productCode: product.data.productCode, gtin: product.data.gtin ?? null, digitalLink: product.data.digitalLink ?? null, name: product.data.name, originMetadata: product.data.originMetadata as Prisma.InputJsonObject, customFields: product.data.customFields as Prisma.InputJsonObject }, select: { id: true, productCode: true, gtin: true, digitalLink: true, name: true, createdAt: true } });
      return Response.json({ data }, { status: 201, headers: { "Cache-Control": "no-store" } });
    }
    const batchData = batch.data!;
    const parent = await prisma.traceabilityProduct.findFirst({ where: { id: batchData.productId, organizationId: tenant.organizationId }, select: { id: true } });
    if (!parent) throw new ApiError(404, "product_not_found", "Product does not exist in this organization.");
    const data = await prisma.productBatch.create({ data: { organizationId: tenant.organizationId, productId: parent.id, batchCode: batchData.batchCode, serialRangeStart: batchData.serialRangeStart ?? null, serialRangeEnd: batchData.serialRangeEnd ?? null, originMetadata: batchData.originMetadata as Prisma.InputJsonObject, anomalyFlags: batchData.anomalyFlags }, select: { id: true, productId: true, batchCode: true, serialRangeStart: true, serialRangeEnd: true, anomalyFlags: true, createdAt: true } });
    return Response.json({ data }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiErrorResponse(error); }
}
