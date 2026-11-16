import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { ensureOrganizationMembership } from "@/lib/auth/tenant-membership";
import { createClient } from "@/lib/supabase/server";

export type TenantContext = {
  userId: string;
  openId: string;
  name: string | null;
  email: string | null;
  organizationId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  organization: { id: string; name: string; slug: string };
};

export async function requireTenantContext(_request?: NextRequest): Promise<TenantContext> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new ApiError(401, "unauthorized", "A valid Supabase Auth session is required.");
  }

  const metadata = user.user_metadata ?? {};
  const name = [metadata.full_name, metadata.name].find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim() ?? null;
  const membership = await ensureOrganizationMembership({ id: user.id, name, email: user.email ?? null });

  return {
    userId: membership.id,
    openId: membership.openId,
    name: membership.name,
    email: membership.email,
    organizationId: membership.organizationId,
    role: membership.role,
    organization: membership.organization,
  };
}
