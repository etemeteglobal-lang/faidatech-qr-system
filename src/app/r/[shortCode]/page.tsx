import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ApiError } from "@/lib/api/errors";
import { ensurePostgresConfigured, prisma } from "@/lib/prisma";
import PublicQrExperience from "@/components/qr/PublicQrExperience";
import PublicVisitorLayout from "@/components/qr/PublicVisitorLayout";
import PublicErrorCard from "@/components/i18n/PublicErrorCard";
import type { MessageKey } from "@/i18n/messages";
import { parseDestinationPayload } from "@/lib/qr/payload-schemas";
import { scheduleQrScan } from "@/lib/qr/scan-logging";
import { SHORT_CODE_PATTERN } from "@/lib/qr/short-code";
import { shouldHidePublicPromoFooter } from "@/lib/billing/public-footer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ shortCode: string }>;
};

export default async function PublicQrPage({ params }: PageProps) {
  const { shortCode } = await params;
  if (!SHORT_CODE_PATTERN.test(shortCode)) notFound();

  let qrCode;
  try {
    ensurePostgresConfigured();
    qrCode = await prisma.qRCode.findFirst({
      where: {
        shortCode,
        isActive: true,
        deletedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: {
        id: true,
        organizationId: true,
        campaignId: true,
        shortCode: true,
        title: true,
        destinationType: true,
        payload: true,
      },
    });
  } catch (error) {
    const messageKey: MessageKey = error instanceof ApiError && error.code === "database_not_configured"
      ? "visitor.preparing"
      : "error.databaseUnavailable";
    return <PublicErrorCard messageKey={messageKey} />;
  }

  if (!qrCode) notFound();

  let payload;
  try {
    payload = parseDestinationPayload(qrCode.destinationType, qrCode.payload);
  } catch {
    return <PublicErrorCard messageKey="visitor.destinationNeedsUpdate" />;
  }

  const requestHeaders = await headers();
  scheduleQrScan(qrCode, new Headers(requestHeaders));

  if (qrCode.destinationType === "URL" && "url" in payload) redirect(payload.url);
  if (qrCode.destinationType === "PDF" && "fileUrl" in payload) redirect(payload.fileUrl);

  const hidePromotionalFooter = await shouldHidePublicPromoFooter(qrCode.organizationId);
  return (
    <PublicVisitorLayout hidePromotionalFooter={hidePromotionalFooter} title={qrCode.title} localizedContent={qrCode.destinationType === "SECTOR_PROFILE" ? undefined : payload.localizedContent} branding={payload.branding}>
      <PublicQrExperience
        shortCode={qrCode.shortCode}
        title={qrCode.title}
        destinationType={qrCode.destinationType}
        payload={payload}
      />
    </PublicVisitorLayout>
  );
}
