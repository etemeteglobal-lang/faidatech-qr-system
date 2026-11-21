-- CreateEnum
CREATE TYPE "ProfileKind" AS ENUM ('INDIVIDUAL', 'ORGANIZATION', 'GOVERNMENT', 'GROUP');

-- CreateEnum
CREATE TYPE "ProfileApprovalStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VerticalSector" AS ENUM ('CONSTRUCTION', 'ARCHITECTURE_INTERIOR', 'CONSTRUCTION_TECHNICIAN', 'HEALTHCARE', 'PHARMACY_MEDICAL_SUPPLIES', 'LEGAL_ADVISORY', 'ACCOUNTING_TAX', 'REAL_ESTATE', 'IT_SOFTWARE', 'CREATIVE_MEDIA', 'EDUCATION_TRAINING', 'AGRICULTURE_COFFEE', 'VETERINARY_LIVESTOCK', 'MANUFACTURING', 'RETAIL_ECOMMERCE', 'TRANSPORT_LOGISTICS', 'AUTOMOTIVE_REPAIR', 'BEAUTY_FASHION', 'FOOD_CATERING', 'TOURISM_TRAVEL', 'SPORTS_WELLNESS', 'CREATORS_MARKETING', 'GOVERNMENT_MUNICIPAL', 'JUSTICE_EMERGENCY', 'RELIGIOUS_CHARITY_NGO', 'ASSOCIATIONS_COOPERATIVES', 'TEAMS_WORKGROUPS', 'JOURNALISM_MEDIA_PR');

-- CreateEnum
CREATE TYPE "SharedServiceType" AS ENUM ('HERITAGE_GUIDE', 'HOSPITALITY_MENU', 'WIFI_WAYFINDING', 'GOVERNMENT_GUIDE', 'PUBLIC_TRANSPORT', 'EVENT_GUIDE', 'EDUCATION_LIBRARY', 'PUBLIC_HEALTH');

-- CreateEnum
CREATE TYPE "AgentLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'ONBOARDING', 'CONVERTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AgentPayoutStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'HELD');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "OrganizationRole" ADD VALUE 'AGENT';

-- CreateTable
CREATE TABLE "BusinessProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "approvedByUserId" TEXT,
    "sector" "VerticalSector" NOT NULL,
    "profileKind" "ProfileKind" NOT NULL DEFAULT 'ORGANIZATION',
    "displayName" VARCHAR(180) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "approvalStatus" "ProfileApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "profileData" JSONB NOT NULL DEFAULT '{}',
    "customFields" JSONB NOT NULL DEFAULT '{}',
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldAgent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "referralCode" VARCHAR(32) NOT NULL,
    "commissionRateBps" INTEGER NOT NULL DEFAULT 0,
    "commissionCurrency" VARCHAR(3) NOT NULL DEFAULT 'ETB',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "payoutNotes" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentLead" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "profileId" TEXT,
    "customerName" VARCHAR(160) NOT NULL,
    "email" VARCHAR(254),
    "phone" VARCHAR(40),
    "businessName" VARCHAR(180),
    "status" "AgentLeadStatus" NOT NULL DEFAULT 'NEW',
    "commissionAmountMinor" INTEGER NOT NULL DEFAULT 0,
    "commissionCurrency" VARCHAR(3) NOT NULL DEFAULT 'ETB',
    "payoutStatus" "AgentPayoutStatus" NOT NULL DEFAULT 'PENDING',
    "commissionBaseMinor" INTEGER NOT NULL DEFAULT 0,
    "notes" VARCHAR(1000),
    "referredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentPayout" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "status" "AgentPayoutStatus" NOT NULL DEFAULT 'PENDING',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "reference" VARCHAR(120),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedService" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "serviceType" "SharedServiceType" NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "summary" VARCHAR(500),
    "supportedLocales" TEXT[] DEFAULT ARRAY['en']::TEXT[],
    "payload" JSONB NOT NULL DEFAULT '{}',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "cacheTtlSeconds" INTEGER NOT NULL DEFAULT 60,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharedService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TraceabilityProduct" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "productCode" VARCHAR(100) NOT NULL,
    "gtin" VARCHAR(14),
    "digitalLink" VARCHAR(500),
    "name" VARCHAR(180) NOT NULL,
    "originMetadata" JSONB NOT NULL DEFAULT '{}',
    "customFields" JSONB NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TraceabilityProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductBatch" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchCode" VARCHAR(100) NOT NULL,
    "serialRangeStart" VARCHAR(100),
    "serialRangeEnd" VARCHAR(100),
    "originMetadata" JSONB NOT NULL DEFAULT '{}',
    "anomalyFlags" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TraceabilityScan" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchId" TEXT,
    "serialValue" VARCHAR(120),
    "source" VARCHAR(40) NOT NULL DEFAULT 'QR',
    "anomalyFlags" JSONB NOT NULL DEFAULT '[]',
    "location" JSONB NOT NULL DEFAULT '{}',
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TraceabilityScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CredentialVerification" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subjectType" VARCHAR(60) NOT NULL,
    "subjectReference" VARCHAR(120) NOT NULL,
    "provider" VARCHAR(40) NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "providerReferenceHash" VARCHAR(64),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "verifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CredentialVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAttachment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entityType" VARCHAR(60) NOT NULL,
    "entityId" VARCHAR(120) NOT NULL,
    "provider" VARCHAR(40) NOT NULL,
    "checkoutUrl" TEXT NOT NULL,
    "reference" VARCHAR(160),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'ETB',
    "amountMinor" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintainedAsset" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assetTag" VARCHAR(100) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "assetType" VARCHAR(80) NOT NULL,
    "location" VARCHAR(180),
    "manualUrl" TEXT,
    "parts" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintainedAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "fieldAgentId" TEXT,
    "recordType" VARCHAR(60) NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "faultReported" BOOLEAN NOT NULL DEFAULT false,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EcosystemAuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" VARCHAR(80) NOT NULL,
    "entityType" VARCHAR(60) NOT NULL,
    "entityId" VARCHAR(120) NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EcosystemAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessProfile_organizationId_sector_approvalStatus_update_idx" ON "BusinessProfile"("organizationId", "sector", "approvalStatus", "updatedAt");

-- CreateIndex
CREATE INDEX "BusinessProfile_organizationId_createdByUserId_createdAt_idx" ON "BusinessProfile"("organizationId", "createdByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "BusinessProfile_approvalStatus_updatedAt_idx" ON "BusinessProfile"("approvalStatus", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessProfile_organizationId_slug_key" ON "BusinessProfile"("organizationId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessProfile_id_organizationId_key" ON "BusinessProfile"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldAgent_userId_key" ON "FieldAgent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldAgent_referralCode_key" ON "FieldAgent"("referralCode");

-- CreateIndex
CREATE INDEX "FieldAgent_organizationId_active_createdAt_idx" ON "FieldAgent"("organizationId", "active", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FieldAgent_id_organizationId_key" ON "FieldAgent"("id", "organizationId");

-- CreateIndex
CREATE INDEX "AgentLead_organizationId_agentId_status_createdAt_idx" ON "AgentLead"("organizationId", "agentId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AgentLead_organizationId_payoutStatus_createdAt_idx" ON "AgentLead"("organizationId", "payoutStatus", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgentLead_id_organizationId_key" ON "AgentLead"("id", "organizationId");

-- CreateIndex
CREATE INDEX "AgentPayout_organizationId_agentId_status_periodStart_idx" ON "AgentPayout"("organizationId", "agentId", "status", "periodStart");

-- CreateIndex
CREATE INDEX "SharedService_published_serviceType_updatedAt_idx" ON "SharedService"("published", "serviceType", "updatedAt");

-- CreateIndex
CREATE INDEX "SharedService_organizationId_published_updatedAt_idx" ON "SharedService"("organizationId", "published", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SharedService_organizationId_slug_key" ON "SharedService"("organizationId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "SharedService_id_organizationId_key" ON "SharedService"("id", "organizationId");

-- CreateIndex
CREATE INDEX "TraceabilityProduct_organizationId_gtin_idx" ON "TraceabilityProduct"("organizationId", "gtin");

-- CreateIndex
CREATE INDEX "TraceabilityProduct_active_updatedAt_idx" ON "TraceabilityProduct"("active", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TraceabilityProduct_organizationId_productCode_key" ON "TraceabilityProduct"("organizationId", "productCode");

-- CreateIndex
CREATE UNIQUE INDEX "TraceabilityProduct_id_organizationId_key" ON "TraceabilityProduct"("id", "organizationId");

-- CreateIndex
CREATE INDEX "ProductBatch_organizationId_productId_createdAt_idx" ON "ProductBatch"("organizationId", "productId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductBatch_organizationId_batchCode_key" ON "ProductBatch"("organizationId", "batchCode");

-- CreateIndex
CREATE UNIQUE INDEX "ProductBatch_id_organizationId_key" ON "ProductBatch"("id", "organizationId");

-- CreateIndex
CREATE INDEX "TraceabilityScan_organizationId_productId_scannedAt_idx" ON "TraceabilityScan"("organizationId", "productId", "scannedAt");

-- CreateIndex
CREATE INDEX "TraceabilityScan_organizationId_batchId_scannedAt_idx" ON "TraceabilityScan"("organizationId", "batchId", "scannedAt");

-- CreateIndex
CREATE INDEX "CredentialVerification_organizationId_subjectType_subjectRe_idx" ON "CredentialVerification"("organizationId", "subjectType", "subjectReference");

-- CreateIndex
CREATE INDEX "CredentialVerification_organizationId_status_expiresAt_idx" ON "CredentialVerification"("organizationId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "PaymentAttachment_organizationId_entityType_entityId_idx" ON "PaymentAttachment"("organizationId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "PaymentAttachment_organizationId_active_provider_idx" ON "PaymentAttachment"("organizationId", "active", "provider");

-- CreateIndex
CREATE INDEX "MaintainedAsset_organizationId_assetType_active_idx" ON "MaintainedAsset"("organizationId", "assetType", "active");

-- CreateIndex
CREATE UNIQUE INDEX "MaintainedAsset_organizationId_assetTag_key" ON "MaintainedAsset"("organizationId", "assetTag");

-- CreateIndex
CREATE UNIQUE INDEX "MaintainedAsset_id_organizationId_key" ON "MaintainedAsset"("id", "organizationId");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_organizationId_assetId_performedAt_idx" ON "MaintenanceRecord"("organizationId", "assetId", "performedAt");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_organizationId_faultReported_performedAt_idx" ON "MaintenanceRecord"("organizationId", "faultReported", "performedAt");

-- CreateIndex
CREATE INDEX "EcosystemAuditLog_organizationId_createdAt_idx" ON "EcosystemAuditLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "EcosystemAuditLog_organizationId_entityType_entityId_create_idx" ON "EcosystemAuditLog"("organizationId", "entityType", "entityId", "createdAt");

-- AddForeignKey
ALTER TABLE "BusinessProfile" ADD CONSTRAINT "BusinessProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessProfile" ADD CONSTRAINT "BusinessProfile_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessProfile" ADD CONSTRAINT "BusinessProfile_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldAgent" ADD CONSTRAINT "FieldAgent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldAgent" ADD CONSTRAINT "FieldAgent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentLead" ADD CONSTRAINT "AgentLead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentLead" ADD CONSTRAINT "AgentLead_agentId_organizationId_fkey" FOREIGN KEY ("agentId", "organizationId") REFERENCES "FieldAgent"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentLead" ADD CONSTRAINT "AgentLead_profileId_organizationId_fkey" FOREIGN KEY ("profileId", "organizationId") REFERENCES "BusinessProfile"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentPayout" ADD CONSTRAINT "AgentPayout_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentPayout" ADD CONSTRAINT "AgentPayout_agentId_organizationId_fkey" FOREIGN KEY ("agentId", "organizationId") REFERENCES "FieldAgent"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedService" ADD CONSTRAINT "SharedService_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraceabilityProduct" ADD CONSTRAINT "TraceabilityProduct_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBatch" ADD CONSTRAINT "ProductBatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBatch" ADD CONSTRAINT "ProductBatch_productId_organizationId_fkey" FOREIGN KEY ("productId", "organizationId") REFERENCES "TraceabilityProduct"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraceabilityScan" ADD CONSTRAINT "TraceabilityScan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraceabilityScan" ADD CONSTRAINT "TraceabilityScan_productId_organizationId_fkey" FOREIGN KEY ("productId", "organizationId") REFERENCES "TraceabilityProduct"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraceabilityScan" ADD CONSTRAINT "TraceabilityScan_batchId_organizationId_fkey" FOREIGN KEY ("batchId", "organizationId") REFERENCES "ProductBatch"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CredentialVerification" ADD CONSTRAINT "CredentialVerification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttachment" ADD CONSTRAINT "PaymentAttachment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintainedAsset" ADD CONSTRAINT "MaintainedAsset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_assetId_organizationId_fkey" FOREIGN KEY ("assetId", "organizationId") REFERENCES "MaintainedAsset"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_fieldAgentId_organizationId_fkey" FOREIGN KEY ("fieldAgentId", "organizationId") REFERENCES "FieldAgent"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EcosystemAuditLog" ADD CONSTRAINT "EcosystemAuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EcosystemAuditLog" ADD CONSTRAINT "EcosystemAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Query-specific JSONB indexes: containment, common key lookup, and approval queue.
CREATE INDEX "BusinessProfile_profileData_path_gin"
  ON "BusinessProfile" USING GIN ("profileData" jsonb_path_ops);
CREATE INDEX "BusinessProfile_license_expr_idx"
  ON "BusinessProfile" (("profileData" ->> 'professionalLicense'));
CREATE INDEX "BusinessProfile_pending_queue_idx"
  ON "BusinessProfile" ("organizationId", "updatedAt" DESC)
  WHERE "approvalStatus" = 'PENDING_APPROVAL';
