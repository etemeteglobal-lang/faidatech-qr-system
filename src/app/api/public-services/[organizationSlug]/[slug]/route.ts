import { NextRequest } from "next/server";
import { apiErrorResponse } from "@/lib/api/errors";
import { ensurePostgresConfigured, prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, context: { params: Promise<{ organizationSlug: string; slug: string }> }): Promise<Response> {
  try {
    ensurePostgresConfigured();
    const { organizationSlug, slug } = await context.params;
    const service = await prisma.sharedService.findFirst({ where: { slug, published: true, organization: { slug: organizationSlug } }, select: { serviceType: true, slug: true, title: true, summary: true, supportedLocales: true, payload: true, cacheTtlSeconds: true, updatedAt: true } });
    if (!service) return Response.json({ error: { code: "not_found", message: "Published service not found." } }, { status: 404, headers: { "Cache-Control": "no-store" } });
    const ttl = Math.max(0, Math.min(300, service.cacheTtlSeconds));
    const cacheControl = ttl ? `public, max-age=0, s-maxage=${ttl}, stale-while-revalidate=60` : "public, max-age=0, s-maxage=0, must-revalidate";
    return Response.json({ data: { serviceType: service.serviceType, slug: service.slug, title: service.title, summary: service.summary, supportedLocales: service.supportedLocales, payload: service.payload, updatedAt: service.updatedAt } }, { headers: { "Cache-Control": cacheControl, "Vary": "Accept-Encoding" } });
  } catch (error) { return apiErrorResponse(error); }
}
