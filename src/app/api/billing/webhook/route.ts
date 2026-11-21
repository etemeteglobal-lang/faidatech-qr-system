import { Prisma } from "@prisma/client";
import { parseVerifiedProviderEvent, providerToPrisma } from "@/lib/billing/providers";
import { ensurePostgresConfigured, prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function uniqueConstraint(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function checkoutStatus(status: string): "PENDING" | "PAID" | "FAILED" | "EXPIRED" | "CANCELED" {
  if (status === "paid") return "PAID";
  if (status === "failed") return "FAILED";
  if (status === "expired") return "EXPIRED";
  if (status === "canceled") return "CANCELED";
  return "PENDING";
}

function subscriptionStatus(status: string): "PENDING" | "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "INCOMPLETE" {
  if (status === "active" || status === "paid") return "ACTIVE";
  if (status === "trialing") return "TRIALING";
  if (status === "past_due" || status === "failed") return "PAST_DUE";
  if (status === "canceled" || status === "expired") return "CANCELED";
  return "PENDING";
}

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();
  try {
    ensurePostgresConfigured();
    const providerHint = request.headers.get("x-billing-provider") ?? request.headers.get("x-provider");
    const event = parseVerifiedProviderEvent(rawBody, request.headers.get("x-billing-signature") ?? request.headers.get("stripe-signature"), providerHint);
    const result = await prisma.$transaction(async (transaction) => {
      try {
        await transaction.billingEvent.create({ data: { providerEventId: event.id, provider: providerToPrisma(event.provider), eventType: event.type, payload: event.raw as Prisma.InputJsonValue, metadata: { checkoutId: event.checkoutId ?? null, organizationId: event.organizationId ?? null } as Prisma.InputJsonValue } });
      } catch (error) {
        if (uniqueConstraint(error)) return { duplicate: true };
        throw error;
      }

      let checkout = event.checkoutId ? await transaction.billingCheckout.findUnique({ where: { id: event.checkoutId } }) : null;
      if (!checkout && event.providerCheckoutId) checkout = await transaction.billingCheckout.findFirst({ where: { provider: providerToPrisma(event.provider), providerCheckoutId: event.providerCheckoutId } });
      if (!checkout && event.transactionReference) checkout = await transaction.billingCheckout.findFirst({ where: { provider: providerToPrisma(event.provider), transactionReference: event.transactionReference } });
      if (checkout && event.organizationId && checkout.organizationId !== event.organizationId) throw new Error("Billing event tenant mismatch");

      if (!checkout) {
        await transaction.billingEvent.update({ where: { providerEventId: event.id }, data: { status: "IGNORED", errorMessage: "No matching checkout was found", processedAt: new Date() } });
        return { ignored: true };
      }

      const updatedCheckout = await transaction.billingCheckout.update({
        where: { id: checkout.id },
        data: {
          status: checkoutStatus(event.status),
          providerCheckoutId: event.providerCheckoutId ?? checkout.providerCheckoutId,
          transactionReference: event.transactionReference ?? checkout.transactionReference,
        },
      });

      if (event.status === "paid" || (event.type === "subscription.updated" && ["active", "trialing"].includes(event.status))) {
        const provider = providerToPrisma(event.provider);
        const providerSubscriptionId = event.providerSubscriptionId ?? `${event.provider}:${checkout.id}`;
        const plan = await transaction.plan.findUnique({ where: { id: checkout.planId } });
        if (!plan) throw new Error("Billing plan not found for checkout");
        if (event.providerPlanId && plan.providerPlanId && event.providerPlanId !== plan.providerPlanId) {
          throw new Error("Billing event plan mismatch");
        }
        const existingSubscription = event.providerSubscriptionId
          ? await transaction.subscription.findUnique({ where: { providerSubscriptionId: event.providerSubscriptionId } })
          : await transaction.subscription.findFirst({ where: { organizationId: checkout.organizationId, provider, providerReferenceId: checkout.id } });
        const subscription = existingSubscription
          ? await transaction.subscription.update({ where: { id: existingSubscription.id }, data: { status: subscriptionStatus(event.status), providerSubscriptionId, providerReferenceId: checkout.id, currentPeriodStart: event.currentPeriodStart ? new Date(event.currentPeriodStart) : undefined, currentPeriodEnd: event.currentPeriodEnd ? new Date(event.currentPeriodEnd) : undefined } })
          : await transaction.subscription.create({ data: { organizationId: checkout.organizationId, planId: checkout.planId, provider, providerSubscriptionId, providerReferenceId: checkout.id, status: subscriptionStatus(event.status), currentPeriodStart: event.currentPeriodStart ? new Date(event.currentPeriodStart) : new Date(), currentPeriodEnd: event.currentPeriodEnd ? new Date(event.currentPeriodEnd) : null } });
        await transaction.planQuota.upsert({
          where: { organizationId_planId: { organizationId: subscription.organizationId, planId: plan.id } },
          create: { organizationId: subscription.organizationId, planId: plan.id, subscriptionId: subscription.id, periodStart: event.currentPeriodStart ? new Date(event.currentPeriodStart) : new Date(), periodEnd: event.currentPeriodEnd ? new Date(event.currentPeriodEnd) : null, dynamicQrLimit: plan.dynamicQrLimit, scansLimit: plan.scanLimit, teamSeatLimit: plan.teamSeatLimit, customDomainLimit: plan.customDomainLimit, storageBytesLimit: plan.storageBytesLimit },
          update: { subscriptionId: subscription.id, periodStart: event.currentPeriodStart ? new Date(event.currentPeriodStart) : undefined, periodEnd: event.currentPeriodEnd ? new Date(event.currentPeriodEnd) : undefined, dynamicQrLimit: plan.dynamicQrLimit, scansLimit: plan.scanLimit, teamSeatLimit: plan.teamSeatLimit, customDomainLimit: plan.customDomainLimit, storageBytesLimit: plan.storageBytesLimit },
        });
      }

      await transaction.billingEvent.update({ where: { providerEventId: event.id }, data: { status: "PROCESSED", processedAt: new Date() } });
      return { checkoutId: updatedCheckout.id, status: updatedCheckout.status };
    });
    return Response.json({ received: true, ...result });
  } catch (error) {
    console.error("Billing webhook rejected", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "invalid_webhook" }, { status: 400 });
  }
}
