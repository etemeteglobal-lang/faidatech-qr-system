import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { apiErrorResponse, ApiError, readJsonBody } from "@/lib/api/errors";
import { requireOrganizationAdmin, requireTenantContext } from "@/lib/auth/tenant-context";
import { ensurePostgresConfigured, prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const inputSchema = z.object({ entityType: z.string().trim().min(1).max(60), entityId: z.string().trim().min(1).max(120), provider: z.enum(["TELEBIRR", "CHAPA", "STRIPE", "BANK", "OTHER"]), checkoutUrl: z.string().url().max(2000), reference: z.string().max(160).optional().nullable(), currency: z.string().regex(/^[A-Z]{3}$/).default("ETB"), amountMinor: z.number().int().min(0).max(2_000_000_000).optional().nullable(), metadata: z.record(z.string(), z.union([z.string().max(250), z.number(), z.boolean(), z.null()])).default({}) });

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request);
    if (tenant.role === "AGENT") throw new ApiError(403, "forbidden", "Payment attachments are not in the agent data scope.");
    ensurePostgresConfigured();
    const rows = await prisma.paymentAttachment.findMany({ where: { organizationId: tenant.organizationId }, orderBy: { updatedAt: "desc" }, take: 100, select: { id: true, entityType: true, entityId: true, provider: true, checkoutUrl: true, reference: true, currency: true, amountMinor: true, active: true, updatedAt: true } });
    return Response.json({ data: rows }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiErrorResponse(error); }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request);
    requireOrganizationAdmin(tenant);
    const parsed = inputSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) return Response.json({ error: { code: "validation_error", issues: parsed.error.issues } }, { status: 400 });
    const url = new URL(parsed.data.checkoutUrl);
    if (url.protocol !== "https:" || url.username || url.password) throw new ApiError(400, "invalid_checkout_url", "Checkout links must use credential-free HTTPS URLs.");
    ensurePostgresConfigured();
    const row = await prisma.paymentAttachment.create({ data: { organizationId: tenant.organizationId, entityType: parsed.data.entityType, entityId: parsed.data.entityId, provider: parsed.data.provider, checkoutUrl: url.toString(), reference: parsed.data.reference ?? null, currency: parsed.data.currency, amountMinor: parsed.data.amountMinor ?? null, metadata: parsed.data.metadata as Prisma.InputJsonObject }, select: { id: true, entityType: true, entityId: true, provider: true, checkoutUrl: true, reference: true, currency: true, amountMinor: true, active: true, createdAt: true } });
    return Response.json({ data: row }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiErrorResponse(error); }
}
