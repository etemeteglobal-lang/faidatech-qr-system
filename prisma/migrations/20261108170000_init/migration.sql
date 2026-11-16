-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "OrganizationRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "DestinationType" AS ENUM ('LANDING_PAGE', 'URL', 'VCARD', 'MENU', 'TOURISM_AUDIO', 'PDF');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ScanDeviceType" AS ENUM ('MOBILE', 'TABLET', 'DESKTOP', 'BOT', 'UNKNOWN');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "openId" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "role" "OrganizationRole" NOT NULL DEFAULT 'MEMBER',
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QRCode" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "campaignId" TEXT,
    "shortCode" VARCHAR(32) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "destinationType" "DestinationType" NOT NULL,
    "payload" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QRCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanAnalytics" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "qrCodeId" TEXT NOT NULL,
    "campaignId" TEXT,
    "deviceType" "ScanDeviceType" NOT NULL DEFAULT 'UNKNOWN',
    "deviceOS" VARCHAR(80),
    "userAgent" TEXT,
    "ipHash" VARCHAR(64),
    "countryCode" VARCHAR(8),
    "region" VARCHAR(100),
    "city" VARCHAR(100),
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_createdAt_idx" ON "Organization"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_openId_key" ON "User"("openId");

-- CreateIndex
CREATE INDEX "User_organizationId_createdAt_idx" ON "User"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Campaign_organizationId_status_createdAt_idx" ON "Campaign"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Campaign_organizationId_deletedAt_idx" ON "Campaign"("organizationId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_id_organizationId_key" ON "Campaign"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "QRCode_shortCode_key" ON "QRCode"("shortCode");

-- CreateIndex
CREATE INDEX "QRCode_organizationId_deletedAt_createdAt_idx" ON "QRCode"("organizationId", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "QRCode_organizationId_campaignId_idx" ON "QRCode"("organizationId", "campaignId");

-- CreateIndex
CREATE INDEX "QRCode_isActive_expiresAt_idx" ON "QRCode"("isActive", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "QRCode_id_organizationId_key" ON "QRCode"("id", "organizationId");

-- CreateIndex
CREATE INDEX "ScanAnalytics_organizationId_scannedAt_idx" ON "ScanAnalytics"("organizationId", "scannedAt");

-- CreateIndex
CREATE INDEX "ScanAnalytics_qrCodeId_scannedAt_idx" ON "ScanAnalytics"("qrCodeId", "scannedAt");

-- CreateIndex
CREATE INDEX "ScanAnalytics_campaignId_scannedAt_idx" ON "ScanAnalytics"("campaignId", "scannedAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QRCode" ADD CONSTRAINT "QRCode_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QRCode" ADD CONSTRAINT "QRCode_campaignId_organizationId_fkey" FOREIGN KEY ("campaignId", "organizationId") REFERENCES "Campaign"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanAnalytics" ADD CONSTRAINT "ScanAnalytics_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanAnalytics" ADD CONSTRAINT "ScanAnalytics_qrCodeId_organizationId_fkey" FOREIGN KEY ("qrCodeId", "organizationId") REFERENCES "QRCode"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanAnalytics" ADD CONSTRAINT "ScanAnalytics_campaignId_organizationId_fkey" FOREIGN KEY ("campaignId", "organizationId") REFERENCES "Campaign"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

