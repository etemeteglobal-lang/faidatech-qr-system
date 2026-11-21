import type { NextRequest } from "next/server";
import { apiErrorResponse } from "@/lib/api/errors";
import { requireTenantContext } from "@/lib/auth/tenant-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request, { allowAgent: true });
    return Response.json(
      {
        data: {
          user: {
            id: tenant.userId,
            name: tenant.name,
            email: tenant.email,
            role: tenant.role,
          },
          organization: tenant.organization,
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
