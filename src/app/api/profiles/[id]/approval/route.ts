import { NextRequest } from "next/server";
import { z } from "zod";
import { apiErrorResponse, ApiError, readJsonBody } from "@/lib/api/errors";
import { requireOrganizationAdmin, requireTenantContext } from "@/lib/auth/tenant-context";
import { ensurePostgresConfigured, prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const decisionSchema = z.object({ decision: z.enum(["SUBMIT", "APPROVE", "REJECT"]), reason: z.string().trim().max(500).optional() });

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request);
    if (tenant.role === "AGENT") throw new ApiError(403, "forbidden", "Field agents cannot approve or submit profiles.");
    const { id } = await context.params;
    const parsed = decisionSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) return Response.json({ error: { code: "validation_error", issues: parsed.error.issues } }, { status: 400 });
    const { decision, reason } = parsed.data;
    if (decision !== "SUBMIT") requireOrganizationAdmin(tenant);
    ensurePostgresConfigured();
    const current = await prisma.businessProfile.findFirst({ where: { id, organizationId: tenant.organizationId }, select: { id: true, createdByUserId: true, approvalStatus: true } });
    if (!current) throw new ApiError(404, "not_found", "Profile not found.");
    if (decision === "SUBMIT" && tenant.role !== "OWNER" && tenant.role !== "ADMIN" && current.createdByUserId !== tenant.userId) {
      throw new ApiError(403, "forbidden", "Members may submit only profiles they created.");
    }
    let nextStatus: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
    if (decision === "SUBMIT") {
      if (current.approvalStatus !== "DRAFT" && current.approvalStatus !== "REJECTED") throw new ApiError(409, "invalid_transition", "Only draft or rejected profiles can be submitted.");
      nextStatus = "PENDING_APPROVAL";
    } else {
      if (current.approvalStatus !== "PENDING_APPROVAL") throw new ApiError(409, "invalid_transition", "Only profiles awaiting approval can be reviewed.");
      nextStatus = decision === "APPROVE" ? "APPROVED" : "REJECTED";
      if (decision === "REJECT" && !reason?.trim()) throw new ApiError(400, "reason_required", "A rejection reason is required.");
    }
    const updated = await prisma.$transaction(async (tx) => {
      const profile = await tx.businessProfile.update({
        where: { id }, data: {
          approvalStatus: nextStatus,
          approvedByUserId: decision === "APPROVE" ? tenant.userId : decision === "REJECT" ? null : undefined,
          approvedAt: decision === "APPROVE" ? new Date() : decision === "REJECT" || decision === "SUBMIT" ? null : undefined,
          rejectionReason: decision === "REJECT" ? reason : decision === "SUBMIT" ? null : undefined,
        }, select: { id: true, slug: true, approvalStatus: true, approvedAt: true, rejectionReason: true },
      });
      await tx.ecosystemAuditLog.create({ data: { organizationId: tenant.organizationId, actorUserId: tenant.userId, action: `PROFILE_${decision}`, entityType: "BusinessProfile", entityId: profile.id, details: { from: current.approvalStatus, to: nextStatus, reason: reason ?? null } } });
      return profile;
    });
    return Response.json({ data: updated }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiErrorResponse(error); }
}
