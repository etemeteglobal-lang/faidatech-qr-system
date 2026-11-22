import { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";

export const STARTER_PLAN = {
  code: "starter_free_monthly_etb",
  name: "Starter / Free",
  billingInterval: "MONTHLY" as const,
  currency: "ETB",
  priceMinor: 0,
  dynamicQrLimit: 5,
  scanLimit: 1_000,
  teamSeatLimit: 1,
  customDomainLimit: 0,
  storageBytesLimit: BigInt(50 * 1024 * 1024),
  featureFlags: { analytics: true, multilingual: true },
};

function isMissingBillingTables(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error.code === "P2021" || error.code === "P2022");
}

export async function ensureDefaultBillingForOrganization(organizationId: string): Promise<boolean> {
  try {
    await prisma.$transaction(async (transaction) => {
      const plan = await transaction.plan.upsert({
        where: { code: STARTER_PLAN.code },
        create: STARTER_PLAN,
        update: { active: true },
      });
      await transaction.planQuota.upsert({
        where: { organizationId_planId: { organizationId, planId: plan.id } },
        create: {
          organizationId,
          planId: plan.id,
          periodStart: new Date(),
          dynamicQrLimit: plan.dynamicQrLimit,
          scansLimit: plan.scanLimit,
          teamSeatLimit: plan.teamSeatLimit,
          customDomainLimit: plan.customDomainLimit,
          storageBytesLimit: plan.storageBytesLimit,
        },
        update: {
          dynamicQrLimit: plan.dynamicQrLimit,
          scansLimit: plan.scanLimit,
          teamSeatLimit: plan.teamSeatLimit,
          customDomainLimit: plan.customDomainLimit,
          storageBytesLimit: plan.storageBytesLimit,
        },
      });
    });
    return true;
  } catch (error) {
    if (isMissingBillingTables(error)) return false;
    throw error;
  }
}

export async function getBillingSnapshot(organizationId: string) {
  try {
    await ensureDefaultBillingForOrganization(organizationId);
    const activeSubscription = await prisma.subscription.findFirst({
      where: { organizationId, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
      orderBy: { updatedAt: "desc" },
      include: { plan: true },
    });
    const plan = activeSubscription?.plan ?? await prisma.plan.findUnique({ where: { code: STARTER_PLAN.code } });
    if (!plan) return null;
    const quota = await prisma.planQuota.findUnique({ where: { organizationId_planId: { organizationId, planId: plan.id } } });
    return { plan, quota, subscription: activeSubscription };
  } catch (error) {
    if (isMissingBillingTables(error)) return null;
    throw error;
  }
}

export async function assertDynamicQrQuota(organizationId: string): Promise<void> {
  const snapshot = await getBillingSnapshot(organizationId);
  if (!snapshot?.quota) return;
  if (snapshot.quota.dynamicQrLimit < 0) return;
  const used = await prisma.qRCode.count({ where: { organizationId, deletedAt: null } });
  if (used >= snapshot.quota.dynamicQrLimit) {
    throw new ApiError(402, "dynamic_qr_quota_exceeded", `Your ${snapshot.plan.name} plan allows ${snapshot.quota.dynamicQrLimit} active QR codes. Upgrade to create more.`);
  }
}

export async function incrementDynamicQrUsage(organizationId: string): Promise<void> {
  try {
    const snapshot = await getBillingSnapshot(organizationId);
    if (!snapshot?.quota) return;
    await prisma.planQuota.update({
      where: { organizationId_planId: { organizationId, planId: snapshot.plan.id } },
      data: { dynamicQrUsed: { increment: 1 } },
    });
  } catch (error) {
    if (!isMissingBillingTables(error)) throw error;
  }
}

export async function assertStorageQuota(organizationId: string, bytes: number): Promise<void> {
  const snapshot = await getBillingSnapshot(organizationId);
  if (!snapshot?.quota || snapshot.quota.storageBytesLimit < BigInt(0)) return;
  if (snapshot.quota.storageBytesUsed + BigInt(bytes) > snapshot.quota.storageBytesLimit) {
    throw new ApiError(402, "storage_quota_exceeded", "Your workspace storage allowance has been reached. Upgrade your plan to add more profile files.");
  }
}

export async function incrementStorageUsage(organizationId: string, bytes: number): Promise<void> {
  try {
    const snapshot = await getBillingSnapshot(organizationId);
    if (!snapshot?.quota) return;
    await prisma.planQuota.update({
      where: { organizationId_planId: { organizationId, planId: snapshot.plan.id } },
      data: { storageBytesUsed: { increment: BigInt(bytes) } },
    });
  } catch (error) {
    if (!isMissingBillingTables(error)) throw error;
  }
}

export function quotaJsonValue(value: unknown): Prisma.InputJsonValue {
  return (value && typeof value === "object" ? value : {}) as Prisma.InputJsonValue;
}
