CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY');
CREATE TYPE "PaymentProvider" AS ENUM ('TELEBIRR', 'CHAPA', 'STRIPE');
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE');
CREATE TYPE "BillingCheckoutStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELED');
CREATE TYPE "BillingEventStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED', 'IGNORED');

CREATE TABLE "Plan" (
  "id" TEXT NOT NULL,
  "code" VARCHAR(80) NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "billingInterval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
  "currency" VARCHAR(3) NOT NULL DEFAULT 'ETB',
  "priceMinor" INTEGER NOT NULL DEFAULT 0,
  "featureFlags" JSONB NOT NULL DEFAULT '{}',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "providerPlanId" VARCHAR(160),
  "dynamicQrLimit" INTEGER NOT NULL,
  "scanLimit" INTEGER NOT NULL,
  "teamSeatLimit" INTEGER NOT NULL,
  "customDomainLimit" INTEGER NOT NULL,
  "storageBytesLimit" BIGINT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Plan_code_key" ON "Plan"("code");
CREATE UNIQUE INDEX "Plan_providerPlanId_key" ON "Plan"("providerPlanId");
CREATE INDEX "Plan_active_code_idx" ON "Plan"("active", "code");

CREATE TABLE "Subscription" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "providerSubscriptionId" VARCHAR(200),
  "providerReferenceId" VARCHAR(200),
  "providerCustomerId" VARCHAR(200),
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
  "currentPeriodStart" TIMESTAMP(3),
  "currentPeriodEnd" TIMESTAMP(3),
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Subscription_providerSubscriptionId_key" ON "Subscription"("providerSubscriptionId");
CREATE INDEX "Subscription_organizationId_status_idx" ON "Subscription"("organizationId", "status");
CREATE INDEX "Subscription_provider_providerReferenceId_idx" ON "Subscription"("provider", "providerReferenceId");
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "PlanQuota" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3),
  "dynamicQrUsed" INTEGER NOT NULL DEFAULT 0,
  "dynamicQrLimit" INTEGER NOT NULL,
  "scansUsed" INTEGER NOT NULL DEFAULT 0,
  "scansLimit" INTEGER NOT NULL,
  "teamSeatsUsed" INTEGER NOT NULL DEFAULT 0,
  "teamSeatLimit" INTEGER NOT NULL,
  "customDomainsUsed" INTEGER NOT NULL DEFAULT 0,
  "customDomainLimit" INTEGER NOT NULL,
  "storageBytesUsed" BIGINT NOT NULL DEFAULT 0,
  "storageBytesLimit" BIGINT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlanQuota_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlanQuota_organizationId_planId_key" ON "PlanQuota"("organizationId", "planId");
CREATE INDEX "PlanQuota_organizationId_periodEnd_idx" ON "PlanQuota"("organizationId", "periodEnd");
ALTER TABLE "PlanQuota" ADD CONSTRAINT "PlanQuota_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanQuota" ADD CONSTRAINT "PlanQuota_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanQuota" ADD CONSTRAINT "PlanQuota_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "BillingCheckout" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "paymentMethod" VARCHAR(40) NOT NULL,
  "idempotencyKey" VARCHAR(128) NOT NULL,
  "providerCheckoutId" VARCHAR(200),
  "transactionReference" VARCHAR(200),
  "checkoutUrl" TEXT,
  "returnUrl" TEXT NOT NULL,
  "cancelUrl" TEXT NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "status" "BillingCheckoutStatus" NOT NULL DEFAULT 'PENDING',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingCheckout_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BillingCheckout_providerCheckoutId_key" ON "BillingCheckout"("providerCheckoutId");
CREATE UNIQUE INDEX "BillingCheckout_organizationId_idempotencyKey_key" ON "BillingCheckout"("organizationId", "idempotencyKey");
CREATE INDEX "BillingCheckout_organizationId_status_createdAt_idx" ON "BillingCheckout"("organizationId", "status", "createdAt");
CREATE INDEX "BillingCheckout_provider_transactionReference_idx" ON "BillingCheckout"("provider", "transactionReference");
ALTER TABLE "BillingCheckout" ADD CONSTRAINT "BillingCheckout_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingCheckout" ADD CONSTRAINT "BillingCheckout_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "BillingEvent" (
  "id" TEXT NOT NULL,
  "providerEventId" VARCHAR(200) NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "eventType" VARCHAR(100) NOT NULL,
  "status" "BillingEventStatus" NOT NULL DEFAULT 'RECEIVED',
  "payload" JSONB NOT NULL,
  "metadata" JSONB,
  "errorMessage" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BillingEvent_providerEventId_key" ON "BillingEvent"("providerEventId");
CREATE INDEX "BillingEvent_provider_status_receivedAt_idx" ON "BillingEvent"("provider", "status", "receivedAt");
