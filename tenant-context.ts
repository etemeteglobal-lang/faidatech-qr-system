import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { getManusSessionToken, verifyManusSessionToken } from "@/lib/auth/manus-jwt";
import { ensurePostgresConfigured, prisma } from "@/lib/prisma";

export type TenantContext = {
  userId: string;
  openId: string;
  name: string | null;
  email: string | null;
  organizationId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  organization: { id: string; name: string; slug: string };
};

export async function requireTenantContext(request: NextRequest): Promise<TenantContext> {
  const token = getManusSessionToken(request);
  if (!token) {
    throw new ApiError(401, "unauthorized", "A valid application session is required.");
  }

  const openId = await verifyManusSessionToken(token);
  ensurePostgresConfigured();

  const user = await prisma.user.findUnique({
    where: { openId },
    select: {
      id: true,
      openId: true,
      name: true,
      email: true,
      organizationId: true,
      role: true,
      organization: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!user) {
    throw new ApiError(
      403,
      "organization_membership_required",
      "The authenticated user is not associated with a FaidATech organization.",
    );
  }

  return {
    userId: user.id,
    openId: user.openId,
    name: user.name,
    email: user.email,
    organizationId: user.organizationId,
    role: user.role,
    organization: user.organization,
  };
}
