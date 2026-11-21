import { createHmac, timingSafeEqual } from "node:crypto";

export type PaymentProviderCode = "telebirr" | "chapa" | "stripe";
export type BillingCheckoutStatusCode = "pending" | "paid" | "failed" | "expired" | "canceled";
export type ProviderEventStatus = "pending" | "paid" | "failed" | "expired" | "canceled" | "active" | "past_due" | "trialing";

export type BillingPlan = {
  id: string;
  code: string;
  name: string;
  billingInterval: "MONTHLY" | "YEARLY";
  currency: string;
  priceMinor: number;
  active: boolean;
  providerPlanId: string | null;
};

export type CheckoutRequest = {
  checkoutId: string;
  plan: BillingPlan;
  provider: PaymentProviderCode;
  organizationId: string;
  userId: string;
  returnUrl: string;
  cancelUrl: string;
  idempotencyKey: string;
  metadata?: Record<string, string>;
};

export type CheckoutResponse = {
  status: "pending" | "unconfigured";
  checkoutUrl?: string;
  providerCheckoutId?: string;
  transactionReference?: string;
  instructions?: string;
};

export type VerifiedProviderEvent = {
  id: string;
  provider: PaymentProviderCode;
  type: "checkout.pending" | "checkout.paid" | "checkout.failed" | "checkout.expired" | "checkout.canceled" | "subscription.updated";
  status: ProviderEventStatus;
  checkoutId?: string;
  providerCheckoutId?: string;
  transactionReference?: string;
  providerSubscriptionId?: string;
  providerCustomerId?: string;
  providerPlanId?: string;
  organizationId?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  raw: Record<string, unknown>;
};

type ProviderConfig = {
  baseUrl?: string;
  secretKey?: string;
  webhookSecret?: string;
  label: string;
};

const providerConfig: Record<PaymentProviderCode, ProviderConfig> = {
  telebirr: {
    baseUrl: process.env.TELEBIRR_API_BASE_URL,
    secretKey: process.env.TELEBIRR_SECRET_KEY,
    webhookSecret: process.env.TELEBIRR_WEBHOOK_SECRET,
    label: "Telebirr",
  },
  chapa: {
    baseUrl: process.env.CHAPA_API_BASE_URL,
    secretKey: process.env.CHAPA_SECRET_KEY,
    webhookSecret: process.env.CHAPA_WEBHOOK_SECRET,
    label: "Chapa",
  },
  stripe: {
    baseUrl: process.env.STRIPE_API_BASE_URL,
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    label: "Stripe",
  },
};

export function providerToPrisma(provider: PaymentProviderCode): "TELEBIRR" | "CHAPA" | "STRIPE" {
  return provider.toUpperCase() as "TELEBIRR" | "CHAPA" | "STRIPE";
}

export function isPaymentProvider(value: unknown): value is PaymentProviderCode {
  return value === "telebirr" || value === "chapa" || value === "stripe";
}

function providerUrl(provider: PaymentProviderCode, path: string): string {
  const baseUrl = providerConfig[provider].baseUrl?.trim();
  if (!baseUrl) throw new Error(`${providerConfig[provider].label} is not configured`);
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function sandboxReference(checkoutId: string): string {
  return `sandbox_${checkoutId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 32)}`;
}

export async function createCheckout(request: CheckoutRequest): Promise<CheckoutResponse> {
  const config = providerConfig[request.provider];
  if (!config.baseUrl || !config.secretKey) {
    return {
      status: "unconfigured",
      transactionReference: sandboxReference(request.checkoutId),
      instructions: `${config.label} is not configured for live payments. Keep this checkout pending and configure the provider before accepting payment.`,
    };
  }

  const response = await fetch(providerUrl(request.provider, "checkout/sessions"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.secretKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": request.idempotencyKey,
    },
    body: JSON.stringify({
      amount: request.plan.priceMinor,
      currency: request.plan.currency,
      planCode: request.plan.code,
      interval: request.plan.billingInterval.toLowerCase(),
      metadata: { ...request.metadata, checkoutId: request.checkoutId, organizationId: request.organizationId, userId: request.userId },
      successUrl: request.returnUrl,
      cancelUrl: request.cancelUrl,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`${config.label} checkout request failed with ${response.status}`);
  const data = await response.json() as { checkoutUrl?: string; url?: string; id?: string; reference?: string };
  const checkoutUrl = data.checkoutUrl ?? data.url;
  if (!checkoutUrl) throw new Error(`${config.label} returned no checkout URL`);
  return { status: "pending", checkoutUrl, providerCheckoutId: data.id, transactionReference: data.reference ?? data.id };
}

export function verifyProviderSignature(rawBody: string, signature: string | null, provider: PaymentProviderCode): boolean {
  const secret = providerConfig[provider].webhookSecret?.trim();
  if (!secret || !signature) return false;
  const provided = signature.replace(/^sha256=/i, "").trim();
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(provided, "utf8");
  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
}

function normalizedStatus(value: unknown): ProviderEventStatus {
  if (value === "paid" || value === "success" || value === "succeeded" || value === "active") return value === "active" ? "active" : "paid";
  if (value === "failed" || value === "failure" || value === "past_due") return value === "past_due" ? "past_due" : "failed";
  if (value === "expired") return "expired";
  if (value === "canceled" || value === "cancelled") return "canceled";
  if (value === "trialing") return "trialing";
  return "pending";
}

export function parseVerifiedProviderEvent(rawBody: string, signature: string | null, providerHint?: string | null): VerifiedProviderEvent {
  const event = JSON.parse(rawBody) as Record<string, unknown>;
  const data = event.data && typeof event.data === "object" ? event.data as Record<string, unknown> : event;
  const metadata = data.metadata && typeof data.metadata === "object" ? data.metadata as Record<string, unknown> : {};
  const providerValue = providerHint ?? event.provider ?? data.provider;
  if (!isPaymentProvider(providerValue)) throw new Error("Unsupported billing provider");
  if (!verifyProviderSignature(rawBody, signature, providerValue)) throw new Error("Invalid billing provider signature");
  const id = typeof event.id === "string" ? event.id : typeof data.eventId === "string" ? data.eventId : "";
  if (!id) throw new Error("Billing event ID is required");
  const status = normalizedStatus(data.status ?? data.paymentStatus ?? event.type);
  const typeValue = typeof event.type === "string" ? event.type : "checkout.updated";
  const type = status === "paid" || typeValue.includes("success") || typeValue.includes("paid") ? "checkout.paid"
    : status === "failed" ? "checkout.failed"
      : status === "expired" ? "checkout.expired"
        : status === "canceled" ? "checkout.canceled"
          : typeValue.includes("subscription") ? "subscription.updated" : "checkout.pending";
  const stringValue = (key: string): string | undefined => typeof data[key] === "string" ? data[key] as string : typeof metadata[key] === "string" ? metadata[key] as string : undefined;
  return {
    id,
    provider: providerValue,
    type,
    status,
    checkoutId: stringValue("checkoutId"),
    providerCheckoutId: stringValue("checkoutId") ?? stringValue("sessionId") ?? stringValue("checkoutSessionId"),
    transactionReference: stringValue("reference") ?? stringValue("transactionReference") ?? stringValue("txRef"),
    providerSubscriptionId: stringValue("subscriptionId") ?? stringValue("subscription"),
    providerCustomerId: stringValue("customerId") ?? stringValue("customer"),
    providerPlanId: stringValue("planId"),
    organizationId: stringValue("organizationId"),
    currentPeriodStart: stringValue("currentPeriodStart"),
    currentPeriodEnd: stringValue("currentPeriodEnd"),
    raw: event,
  };
}
