CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE');

CREATE TABLE "Plan" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "providerPlanId" VARCHAR(160) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Plan_providerPlanId_key" ON "Plan"("providerPlanId");

CREATE TABLE "Subscription" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "providerSubscriptionId" VARCHAR(200) NOT NULL,
  "providerCustomerId" VARCHAR(200),
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'INCOMPLETE',
  "currentPeriodStart" TIMESTAMP(3),
  "currentPeriodEnd" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Subscription_providerSubscriptionId_key" ON "Subscription"("providerSubscriptionId");
CREATE INDEX "Subscription_organizationId_status_idx" ON "Subscription"("organizationId", "status");
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "PlanQuota" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3),
  "used" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlanQuota_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlanQuota_organizationId_planId_key" ON "PlanQuota"("organizationId", "planId");
ALTER TABLE "PlanQuota" ADD CONSTRAINT "PlanQuota_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanQuota" ADD CONSTRAINT "PlanQuota_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "BillingCheckout" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "idempotencyKey" VARCHAR(128) NOT NULL,
  "checkoutUrl" TEXT NOT NULL,
  "providerCheckoutId" VARCHAR(200),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingCheckout_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BillingCheckout_providerCheckoutId_key" ON "BillingCheckout"("providerCheckoutId");
CREATE UNIQUE INDEX "BillingCheckout_organizationId_idempotencyKey_key" ON "BillingCheckout"("organizationId", "idempotencyKey");
ALTER TABLE "BillingCheckout" ADD CONSTRAINT "BillingCheckout_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingCheckout" ADD CONSTRAINT "BillingCheckout_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "BillingEvent" (
  "id" TEXT NOT NULL,
  "providerEventId" VARCHAR(200) NOT NULL,
  "eventType" VARCHAR(100) NOT NULL,
  "payload" JSONB NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BillingEvent_providerEventId_key" ON "BillingEvent"("providerEventId");
