import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiErrorResponse, ApiError, readJsonBody } from "@/lib/api/errors";
import { requireTenantContext } from "@/lib/auth/tenant-context";
import { createCheckout } from "@/lib/billing/providers";
import { prisma } from "@/lib/prisma";

const inputSchema = z.object({
  planId: z.string().cuid(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
}).strict();

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request);
    const input = inputSchema.parse(await readJsonBody(request));
    const plan = await prisma.plan.findFirst({ where: { id: input.planId, active: true } });
    if (!plan) throw new ApiError(404, "billing_plan_not_found", "The selected billing plan is unavailable.");
    const idempotencyKey = request.headers.get("Idempotency-Key")?.trim();
    if (!idempotencyKey || idempotencyKey.length < 16 || idempotencyKey.length > 128) {
      throw new ApiError(400, "idempotency_key_required", "Provide a unique Idempotency-Key for this checkout request.");
    }
    const existing = await prisma.billingCheckout.findUnique({ where: { organizationId_idempotencyKey: { organizationId: tenant.organizationId, idempotencyKey } } });
    if (existing) return Response.json({ data: { checkoutUrl: existing.checkoutUrl, providerCheckoutId: existing.providerCheckoutId } }, { headers: { "Cache-Control": "private, no-store" } });
    const checkout = await createCheckout({ plan, organizationId: tenant.organizationId, userId: tenant.userId, successUrl: input.successUrl, cancelUrl: input.cancelUrl, idempotencyKey });
    const saved = await prisma.billingCheckout.create({ data: { organizationId: tenant.organizationId, planId: plan.id, idempotencyKey, checkoutUrl: checkout.checkoutUrl, providerCheckoutId: checkout.providerCheckoutId ?? null } });
    return Response.json({ data: { checkoutUrl: saved.checkoutUrl, providerCheckoutId: saved.providerCheckoutId } }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
