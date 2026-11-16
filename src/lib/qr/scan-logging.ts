import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractScanMetadata } from "@/lib/qr/scan-metadata";

type ScanTarget = {
  id: string;
  organizationId: string;
  campaignId: string | null;
};

export function scheduleQrScan(target: ScanTarget, headers: Headers): void {
  const metadata = extractScanMetadata(headers);
  after(async () => {
    try {
      await prisma.scanAnalytics.create({
        data: {
          organizationId: target.organizationId,
          qrCodeId: target.id,
          campaignId: target.campaignId,
          ...metadata,
        },
      });
    } catch (error) {
      console.error("Could not record QR scan analytics", error);
    }
  });
}
