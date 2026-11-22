import { NextRequest } from "next/server";
import { z } from "zod";
import { apiErrorResponse, readJsonBody } from "@/lib/api/errors";
import { requestRateLimitKey, rateLimit } from "@/lib/api/rate-limit";
import { ensurePostgresConfigured, prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const responseSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.union([z.string().trim().email().max(254), z.literal("")]).optional(),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().min(1).max(3000),
  website: z.string().max(0).optional(),
}).strict();

function actionIsEnabled(payload: unknown): boolean {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
  const actionForm = (payload as Record<string, unknown>).actionForm;
  return Boolean(actionForm && typeof actionForm === "object" && !Array.isArray(actionForm) && (actionForm as Record<string, unknown>).enabled === true);
}

export async function POST(request: NextRequest, context: { params: Promise<{ organizationSlug: string; slug: string }> }): Promise<Response> {
  try {
    const { organizationSlug, slug } = await context.params;
    const key = requestRateLimitKey(request, `service-response:${organizationSlug}:${slug}`);
    if (!rateLimit(key, 8, 60_000)) return Response.json({ error: { code: "rate_limited" } }, { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": "60" } });
    const parsed = responseSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) return Response.json({ error: { code: "validation_error" } }, { status: 400, headers: { "Cache-Control": "no-store" } });

    ensurePostgresConfigured();
    const service = await prisma.sharedService.findFirst({
      where: { slug, published: true, organization: { slug: organizationSlug } },
      select: { id: true, organizationId: true, payload: true },
    });
    if (!service || !actionIsEnabled(service.payload)) return Response.json({ error: { code: "not_found" } }, { status: 404, headers: { "Cache-Control": "no-store" } });

    // Honeypot submissions receive a neutral success response and are not stored.
    if (parsed.data.website) return Response.json({ data: { received: true } }, { status: 202, headers: { "Cache-Control": "no-store" } });
    await prisma.serviceResponse.create({
      data: {
        organizationId: service.organizationId,
        sharedServiceId: service.id,
        visitorName: parsed.data.name,
        visitorEmail: parsed.data.email || null,
        visitorPhone: parsed.data.phone?.trim() || null,
        message: parsed.data.message,
      },
      select: { id: true },
    });
    return Response.json({ data: { received: true } }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
