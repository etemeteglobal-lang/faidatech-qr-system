import type { NextRequest } from "next/server";
import { apiErrorResponse } from "@/lib/api/errors";
import { requireTenantContext } from "@/lib/auth/tenant-context";
import { getBillingSnapshot } from "@/lib/billing/entitlements";
import { ensurePostgresConfigured, prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function serializePlan(plan: { id: string; code: string; name: string; billingInterval: string; currency: string; priceMinor: number; dynamicQrLimit: number; scanLimit: number; teamSeatLimit: number; customDomainLimit: number; storageBytesLimit: bigint; active: boolean }) {
  return { ...plan, storageBytesLimit: plan.storageBytesLimit.toString() };
}

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request);
    ensurePostgresConfigured();
    const [snapshot, plans] = await Promise.all([
      getBillingSnapshot(tenant.organizationId),
      prisma.plan.findMany({ where: { active: true }, orderBy: [{ name: "asc" }, { billingInterval: "asc" }, { currency: "asc" }] }),
    ]);
    return Response.json({
      data: {
        current: snapshot ? {
          plan: serializePlan(snapshot.plan),
          subscription: snapshot.subscription ? { status: snapshot.subscription.status.toLowerCase(), provider: snapshot.subscription.provider.toLowerCase(), currentPeriodEnd: snapshot.subscription.currentPeriodEnd } : null,
          quota: snapshot.quota ? { dynamicQrUsed: snapshot.quota.dynamicQrUsed, dynamicQrLimit: snapshot.quota.dynamicQrLimit, scansUsed: snapshot.quota.scansUsed, scansLimit: snapshot.quota.scansLimit, teamSeatsUsed: snapshot.quota.teamSeatsUsed, teamSeatLimit: snapshot.quota.teamSeatLimit, customDomainsUsed: snapshot.quota.customDomainsUsed, customDomainLimit: snapshot.quota.customDomainLimit } : null,
        } : null,
        plans: plans.map(serializePlan),
      },
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
