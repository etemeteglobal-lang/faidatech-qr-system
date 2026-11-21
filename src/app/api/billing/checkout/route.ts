import { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, apiErrorResponse, readJsonBody } from "@/lib/api/errors";
import { requireTenantContext } from "@/lib/auth/tenant-context";
import { createCheckout, isPaymentProvider, providerToPrisma, type PaymentProviderCode } from "@/lib/billing/providers";
import { getAppOrigin } from "@/lib/app-origin";
import { rateLimit } from "@/lib/api/rate-limit";
import { ensurePostgresConfigured, prisma } from "@/lib/prisma";

const inputSchema = z.object({
  planId: z.string().cuid().optional(),
  planCode: z.string().trim().min(3).max(80).optional(),
  billingInterval: z.enum(["monthly", "yearly"]).default("monthly"),
  provider: z.string().trim().toLowerCase(),
  currency: z.string().trim().length(3).toUpperCase().default("ETB"),
  returnUrl: z.string().url(),
  cancelUrl: z.string().url(),
  bankNote: z.string().trim().max(500).optional(),
}).refine((value) => value.planId || value.planCode, { message: "planId or planCode is required", path: ["planCode"] });

export const runtime = "nodejs";

function safeLocalUrl(value: string): string {
  const origin = getAppOrigin();
  const parsed = new URL(value);
  if (parsed.origin !== origin.origin || parsed.username || parsed.password || parsed.protocol !== origin.protocol) {
    throw new ApiError(400, "unsafe_return_url", "Return and cancel URLs must stay on the application origin.");
  }
  return parsed.toString();
}

function uniqueConstraint(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request);
    if (!rateLimit(`billing-checkout:${tenant.organizationId}`, 10, 60_000)) {
      throw new ApiError(429, "rate_limited", "Too many checkout attempts. Please try again shortly.");
    }
    ensurePostgresConfigured();
    const input = inputSchema.parse(await readJsonBody(request));
    if (!isPaymentProvider(input.provider)) throw new ApiError(400, "unsupported_payment_provider", "Choose Telebirr, Chapa, or Stripe.");
    const provider = input.provider as PaymentProviderCode;
    const returnUrl = safeLocalUrl(input.returnUrl);
    const cancelUrl = safeLocalUrl(input.cancelUrl);
    const idempotencyKey = request.headers.get("Idempotency-Key")?.trim();
    if (!idempotencyKey || idempotencyKey.length < 16 || idempotencyKey.length > 128) {
      throw new ApiError(400, "idempotency_key_required", "Provide a unique Idempotency-Key for this checkout request.");
    }

    const existing = await prisma.billingCheckout.findUnique({ where: { organizationId_idempotencyKey: { organizationId: tenant.organizationId, idempotencyKey } } });
    if (existing) {
      return Response.json({ data: { id: existing.id, status: existing.status.toLowerCase(), checkoutUrl: existing.checkoutUrl, transactionReference: existing.transactionReference, provider: existing.provider.toLowerCase() } }, { headers: { "Cache-Control": "private, no-store" } });
    }

    const plan = await prisma.plan.findFirst({
      where: {
        active: true,
        currency: input.currency,
        billingInterval: input.billingInterval === "yearly" ? "YEARLY" : "MONTHLY",
        ...(input.planId ? { id: input.planId } : { code: input.planCode }),
      },
    });
    if (!plan) throw new ApiError(404, "billing_plan_not_found", "The selected active billing plan is unavailable for this currency and interval.");

    const checkout = await prisma.billingCheckout.create({
      data: {
        organizationId: tenant.organizationId,
        planId: plan.id,
        provider: providerToPrisma(provider),
        paymentMethod: provider,
        idempotencyKey,
        returnUrl,
        cancelUrl,
        amountMinor: plan.priceMinor,
        currency: plan.currency,
        metadata: { bankNote: input.bankNote ?? null, planCode: plan.code } as Prisma.InputJsonValue,
      },
    });

    try {
      const providerResult = await createCheckout({
        checkoutId: checkout.id,
        plan,
        provider,
        organizationId: tenant.organizationId,
        userId: tenant.userId,
        returnUrl,
        cancelUrl,
        idempotencyKey,
        metadata: { planCode: plan.code },
      });
      const updated = await prisma.billingCheckout.update({
        where: { id: checkout.id },
        data: { checkoutUrl: providerResult.checkoutUrl, providerCheckoutId: providerResult.providerCheckoutId, transactionReference: providerResult.transactionReference },
      });
      return Response.json({ data: { id: updated.id, status: providerResult.status, checkoutUrl: updated.checkoutUrl, transactionReference: updated.transactionReference, instructions: providerResult.instructions, provider } }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
    } catch (error) {
      await prisma.billingCheckout.update({ where: { id: checkout.id }, data: { status: "FAILED", metadata: { error: error instanceof Error ? error.message : "provider_request_failed" } as Prisma.InputJsonValue } });
      throw error;
    }
  } catch (error) {
    if (uniqueConstraint(error)) return apiErrorResponse(new ApiError(409, "checkout_in_progress", "A checkout with this idempotency key is already being processed."));
    return apiErrorResponse(error);
  }
}
