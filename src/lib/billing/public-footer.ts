import { prisma } from "@/lib/prisma";

/** Read-only public-page entitlement check; never provisions plans or quota rows. */
export async function shouldHidePublicPromoFooter(organizationId: string): Promise<boolean> {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { organizationId, status: { in: ["ACTIVE", "TRIALING"] } },
      orderBy: { updatedAt: "desc" },
      select: { plan: { select: { code: true, featureFlags: true } } },
    });
    if (!subscription) return false;
    const flags = subscription.plan.featureFlags;
    return subscription.plan.code.toLowerCase().includes("enterprise") ||
      (typeof flags === "object" && flags !== null && !Array.isArray(flags) && "hidePublicPromoFooter" in flags && flags.hidePublicPromoFooter === true);
  } catch {
    return false;
  }
}
