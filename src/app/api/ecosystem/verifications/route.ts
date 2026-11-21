import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { apiErrorResponse, ApiError, readJsonBody } from "@/lib/api/errors";
import { requireOrganizationAdmin, requireTenantContext } from "@/lib/auth/tenant-context";
import { ensurePostgresConfigured, prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const inputSchema = z.object({ subjectType: z.enum(["BUSINESS_PROFILE", "DOCUMENT", "LICENSE"]), subjectReference: z.string().trim().min(6).max(120).regex(/^[A-Za-z][A-Za-z0-9_-]*$/, "Use an opaque internal reference, never a raw government ID."), provider: z.enum(["FAYDA", "MESOB", "MANUAL"]), safeMetadata: z.record(z.string(), z.union([z.string().max(240), z.number(), z.boolean(), z.null()])).default({}) });

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request);
    if (tenant.role === "AGENT") throw new ApiError(403, "forbidden", "Verification records are not in the agent data scope.");
    ensurePostgresConfigured();
    const records = await prisma.credentialVerification.findMany({ where: { organizationId: tenant.organizationId }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, subjectType: true, subjectReference: true, provider: true, status: true, metadata: true, verifiedAt: true, expiresAt: true, createdAt: true } });
    return Response.json({ data: records }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiErrorResponse(error); }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request);
    requireOrganizationAdmin(tenant);
    const parsed = inputSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) return Response.json({ error: { code: "validation_error", issues: parsed.error.issues } }, { status: 400 });
    if (Object.keys(parsed.data.safeMetadata).some((key) => /fayda|national.?id|password|token|secret|document.?image/i.test(key))) throw new ApiError(400, "sensitive_metadata_rejected", "Verification metadata cannot contain raw identity values, tokens, or document images.");
    ensurePostgresConfigured();
    const record = await prisma.credentialVerification.create({ data: { organizationId: tenant.organizationId, subjectType: parsed.data.subjectType, subjectReference: parsed.data.subjectReference, provider: parsed.data.provider, status: "PENDING", metadata: parsed.data.safeMetadata as Prisma.InputJsonObject }, select: { id: true, subjectType: true, subjectReference: true, provider: true, status: true, createdAt: true } });
    await prisma.ecosystemAuditLog.create({ data: { organizationId: tenant.organizationId, actorUserId: tenant.userId, action: "CREDENTIAL_VERIFICATION_REQUESTED", entityType: "CredentialVerification", entityId: record.id, details: { provider: record.provider, subjectType: record.subjectType } } });
    return Response.json({ data: record, hooks: { status: "PENDING", integration: "Configure the provider adapter separately; no raw personal identifiers are stored." } }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiErrorResponse(error); }
}
