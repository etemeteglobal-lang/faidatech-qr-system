import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { apiErrorResponse, ApiError, readJsonBody } from "@/lib/api/errors";
import { requireOrganizationAdmin, requireTenantContext } from "@/lib/auth/tenant-context";
import { ensurePostgresConfigured, prisma } from "@/lib/prisma";
import { sharedServiceInput, validateSharedPayload } from "@/lib/shared-services/schema";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request);
    requireOrganizationAdmin(tenant);
    ensurePostgresConfigured();
    const services = await prisma.sharedService.findMany({ where: { organizationId: tenant.organizationId }, orderBy: { updatedAt: "desc" }, take: 100, select: { id: true, serviceType: true, slug: true, title: true, summary: true, supportedLocales: true, payload: true, published: true, cacheTtlSeconds: true, publishedAt: true, updatedAt: true } });
    const data = services.map(({ payload, ...service }) => ({ ...service, actionEnabled: Boolean(payload && typeof payload === "object" && !Array.isArray(payload) && (payload as Record<string, unknown>).actionForm && typeof (payload as Record<string, unknown>).actionForm === "object" && ((payload as Record<string, Record<string, unknown>>).actionForm.enabled === true)) }));
    return Response.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiErrorResponse(error); }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request);
    requireOrganizationAdmin(tenant);
    const parsed = sharedServiceInput.safeParse(await readJsonBody(request));
    if (!parsed.success) return Response.json({ error: { code: "validation_error", issues: parsed.error.issues } }, { status: 400 });
    if (!validateSharedPayload(parsed.data.payload)) throw new ApiError(413, "payload_too_large", "Shared-service content must be valid JSON under 128 KiB.");
    const localizedContent = (parsed.data.payload as Record<string, unknown>).localizedContent;
    if (localizedContent !== undefined) {
      if (!localizedContent || typeof localizedContent !== "object" || Array.isArray(localizedContent)) throw new ApiError(400, "invalid_localized_content", "localizedContent must be an object keyed by supported locale code.");
      const localeEntries = Object.entries(localizedContent as Record<string, unknown>);
      if (localeEntries.some(([locale, content]) => !parsed.data.supportedLocales.includes(locale as (typeof parsed.data.supportedLocales)[number]) || !content || typeof content !== "object" || Array.isArray(content))) {
        throw new ApiError(400, "invalid_localized_content", "Each localizedContent entry must use a declared supportedLocales code and contain an object.");
      }
    }
    ensurePostgresConfigured();
    const service = await prisma.sharedService.create({ data: { organizationId: tenant.organizationId, serviceType: parsed.data.serviceType, slug: parsed.data.slug, title: parsed.data.title, summary: parsed.data.summary ?? null, supportedLocales: parsed.data.supportedLocales, payload: parsed.data.payload as Prisma.InputJsonObject, cacheTtlSeconds: parsed.data.cacheTtlSeconds }, select: { id: true, slug: true, title: true, serviceType: true, published: true, updatedAt: true } });
    await prisma.ecosystemAuditLog.create({ data: { organizationId: tenant.organizationId, actorUserId: tenant.userId, action: "SHARED_SERVICE_CREATED", entityType: "SharedService", entityId: service.id, details: { serviceType: service.serviceType } } });
    return Response.json({ data: service }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiErrorResponse(error); }
}
