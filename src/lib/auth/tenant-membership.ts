import { randomBytes } from "node:crypto";
import { ensureDefaultBillingForOrganization } from "@/lib/billing/entitlements";
import { ensurePostgresConfigured, prisma } from "@/lib/prisma";

export type AuthenticatedProfile = { id: string; name: string | null; email: string | null };

const membershipSelect = {
  id: true,
  openId: true,
  name: true,
  email: true,
  organizationId: true,
  role: true,
  organization: { select: { id: true, name: true, slug: true } },
} as const;

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function ensureOrganizationMembership(profile: AuthenticatedProfile) {
  ensurePostgresConfigured();

  // The existing schema's unique openId field stores the verified Supabase Auth user ID.
  const name = profile.name?.trim().slice(0, 160) || null;
  const existing = await prisma.user.findUnique({ where: { openId: profile.id }, select: membershipSelect });
  if (existing) {
    const membership = existing.name === name && existing.email === profile.email
      ? existing
      : await prisma.user.update({ where: { id: existing.id }, data: { name, email: profile.email }, select: membershipSelect });
    await ensureDefaultBillingForOrganization(membership.organizationId);
    return membership;
  }

  const displayName = name?.slice(0, 120) || "FaidATech";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const slug = `faida-${randomBytes(6).toString("hex")}`;
    try {
      const membership = await prisma.$transaction(async (transaction) => {
        const organization = await transaction.organization.create({
          data: { name: `${displayName} workspace`, slug },
          select: { id: true },
        });
        return transaction.user.create({
          data: {
            openId: profile.id,
            name,
            email: profile.email,
            role: "OWNER",
            organizationId: organization.id,
          },
          select: membershipSelect,
        });
      });
      await ensureDefaultBillingForOrganization(membership.organizationId);
      return membership;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const winner = await prisma.user.findUnique({ where: { openId: profile.id }, select: membershipSelect });
        if (winner) return winner;
        if (attempt < 2) continue;
      }
      throw error;
    }
  }

  throw new Error("Could not create an organization for this account.");
}
