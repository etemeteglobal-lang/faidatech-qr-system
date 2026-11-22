-- Additive tenant-scoped storage for visitor-submitted shared-service responses.
-- Intentionally not applied by this implementation task.
CREATE TABLE "ServiceResponse" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sharedServiceId" TEXT NOT NULL,
    "visitorName" VARCHAR(120) NOT NULL,
    "visitorEmail" VARCHAR(254),
    "visitorPhone" VARCHAR(40),
    "message" VARCHAR(3000) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'NEW',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceResponse_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ServiceResponse_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ServiceResponse_sharedServiceId_organizationId_fkey" FOREIGN KEY ("sharedServiceId", "organizationId") REFERENCES "SharedService"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ServiceResponse_organizationId_status_submittedAt_idx" ON "ServiceResponse"("organizationId", "status", "submittedAt");
CREATE INDEX "ServiceResponse_sharedServiceId_organizationId_submittedAt_idx" ON "ServiceResponse"("sharedServiceId", "organizationId", "submittedAt");
