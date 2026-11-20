import { parseVerifiedProviderEvent } from "@/lib/billing/providers";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();
  try {
    const event = parseVerifiedProviderEvent(rawBody, request.headers.get("x-billing-signature") ?? request.headers.get("stripe-signature"));
    const alreadyProcessed = await prisma.billingEvent.findUnique({ where: { providerEventId: event.id } });
    if (alreadyProcessed) return Response.json({ received: true, duplicate: true });

    await prisma.$transaction(async (transaction) => {
      await transaction.billingEvent.create({ data: { providerEventId: event.id, eventType: event.type, payload: event.raw as object } });
      if (!event.providerSubscriptionId || !event.organizationId) return;
      const plan = event.providerPlanId ? await transaction.plan.findFirst({ where: { providerPlanId: event.providerPlanId, active: true } }) : null;
      if (!plan) return;
      const status = event.type === "subscription.canceled" ? "CANCELED" : event.type === "invoice.payment_failed" ? "PAST_DUE" : event.status ?? "ACTIVE";
      const subscription = await transaction.subscription.upsert({
        where: { providerSubscriptionId: event.providerSubscriptionId },
        create: { organizationId: event.organizationId, planId: plan.id, providerSubscriptionId: event.providerSubscriptionId, providerCustomerId: event.providerCustomerId ?? null, status, currentPeriodStart: event.currentPeriodStart ? new Date(event.currentPeriodStart) : null, currentPeriodEnd: event.currentPeriodEnd ? new Date(event.currentPeriodEnd) : null },
        update: { planId: plan.id, providerCustomerId: event.providerCustomerId ?? undefined, status, currentPeriodStart: event.currentPeriodStart ? new Date(event.currentPeriodStart) : undefined, currentPeriodEnd: event.currentPeriodEnd ? new Date(event.currentPeriodEnd) : undefined },
      });
      await transaction.planQuota.upsert({ where: { organizationId_planId: { organizationId: subscription.organizationId, planId: plan.id } }, create: { organizationId: subscription.organizationId, planId: plan.id, periodStart: event.currentPeriodStart ? new Date(event.currentPeriodStart) : new Date(), periodEnd: event.currentPeriodEnd ? new Date(event.currentPeriodEnd) : null, used: 0 }, update: { periodStart: event.currentPeriodStart ? new Date(event.currentPeriodStart) : undefined, periodEnd: event.currentPeriodEnd ? new Date(event.currentPeriodEnd) : undefined } });
    });
    return Response.json({ received: true });
  } catch (error) {
    console.error("Billing webhook rejected", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "invalid_webhook" }, { status: 400 });
  }
}
