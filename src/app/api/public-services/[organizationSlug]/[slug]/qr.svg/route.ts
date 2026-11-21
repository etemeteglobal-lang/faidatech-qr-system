import { NextRequest } from "next/server";
import { apiErrorResponse } from "@/lib/api/errors";
import { getAppOrigin } from "@/lib/app-origin";
import { ensurePostgresConfigured, prisma } from "@/lib/prisma";
import { generateSharedServiceQrSvg } from "@/lib/shared-services/qr-svg";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, context: { params: Promise<{ organizationSlug: string; slug: string }> }): Promise<Response> {
  try {
    ensurePostgresConfigured();
    const { organizationSlug, slug } = await context.params;
    const service = await prisma.sharedService.findFirst({ where: { slug, published: true, organization: { slug: organizationSlug } }, select: { title: true, cacheTtlSeconds: true } });
    if (!service) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
    const url = new URL(`/s/${encodeURIComponent(organizationSlug)}/${encodeURIComponent(slug)}`, getAppOrigin()).toString();
    const svg = await generateSharedServiceQrSvg(url, service.title);
    const ttl = Math.max(0, Math.min(300, service.cacheTtlSeconds));
    return new Response(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Content-Disposition": `attachment; filename="${slug}.svg"`, "Cache-Control": ttl ? `public, max-age=0, s-maxage=${ttl}, stale-while-revalidate=60` : "public, max-age=0, s-maxage=0, must-revalidate" } });
  } catch (error) { return apiErrorResponse(error); }
}
