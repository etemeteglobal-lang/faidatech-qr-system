import { createHmac, timingSafeEqual } from "node:crypto";

export type BillingPlan = { id: string; providerPlanId: string; active: boolean };
export type CheckoutRequest = { plan: BillingPlan; organizationId: string; userId: string; successUrl: string; cancelUrl: string; idempotencyKey: string };
export type CheckoutResponse = { checkoutUrl: string; providerCheckoutId?: string };
export type VerifiedProviderEvent = {
  id: string;
  type: "checkout.completed" | "subscription.created" | "subscription.updated" | "subscription.canceled" | "invoice.paid" | "invoice.payment_failed";
  providerSubscriptionId?: string;
  providerCustomerId?: string;
  providerPlanId?: string;
  organizationId?: string;
  status?: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "INCOMPLETE";
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  raw: unknown;
};

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function providerUrl(path: string): string {
  return `${required("BILLING_PROVIDER_BASE_URL").replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

export function verifyProviderSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.BILLING_WEBHOOK_SECRET?.trim();
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = signature.replace(/^sha256=/i, "").trim();
  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(provided, "utf8");
  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
}

export async function createCheckout(request: CheckoutRequest): Promise<CheckoutResponse> {
  const response = await fetch(providerUrl("checkout/sessions"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${required("BILLING_PROVIDER_SECRET")}`,
      "Content-Type": "application/json",
      "Idempotency-Key": request.idempotencyKey,
    },
    body: JSON.stringify({
      planId: request.plan.providerPlanId,
      metadata: { organizationId: request.organizationId, userId: request.userId, planId: request.plan.id },
      successUrl: request.successUrl,
      cancelUrl: request.cancelUrl,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Billing provider checkout request failed with ${response.status}`);
  const data = (await response.json()) as { checkoutUrl?: string; url?: string; id?: string };
  const checkoutUrl = data.checkoutUrl ?? data.url;
  if (!checkoutUrl) throw new Error("Billing provider returned no checkout URL");
  return { checkoutUrl, providerCheckoutId: data.id };
}

export function parseVerifiedProviderEvent(rawBody: string, signature: string | null): VerifiedProviderEvent {
  if (!verifyProviderSignature(rawBody, signature)) throw new Error("Invalid billing provider signature");
  const event = JSON.parse(rawBody) as Record<string, unknown>;
  const data = (event.data && typeof event.data === "object" ? event.data : event) as Record<string, unknown>;
  const metadata = data.metadata && typeof data.metadata === "object" ? data.metadata as Record<string, unknown> : {};
  const type = event.type;
  if (typeof event.id !== "string" || typeof type !== "string" || !["checkout.completed", "subscription.created", "subscription.updated", "subscription.canceled", "invoice.paid", "invoice.payment_failed"].includes(type)) {
    throw new Error("Unsupported billing provider event");
  }
  return {
    id: event.id,
    type: type as VerifiedProviderEvent["type"],
    providerSubscriptionId: typeof data.subscriptionId === "string" ? data.subscriptionId : typeof data.subscription === "string" ? data.subscription : undefined,
    providerCustomerId: typeof data.customerId === "string" ? data.customerId : typeof data.customer === "string" ? data.customer : undefined,
    providerPlanId: typeof data.planId === "string" ? data.planId : undefined,
    organizationId: typeof metadata.organizationId === "string" ? metadata.organizationId : undefined,
    status: typeof data.status === "string" ? data.status as VerifiedProviderEvent["status"] : undefined,
    currentPeriodStart: typeof data.currentPeriodStart === "string" ? data.currentPeriodStart : undefined,
    currentPeriodEnd: typeof data.currentPeriodEnd === "string" ? data.currentPeriodEnd : undefined,
    raw: event,
  };
}
