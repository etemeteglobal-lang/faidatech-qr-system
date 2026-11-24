import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicSectorProfile from "@/components/qr/PublicSectorProfile";
import PublicVisitorLayout from "@/components/qr/PublicVisitorLayout";
import { shouldHidePublicPromoFooter } from "@/lib/billing/public-footer";
import { ensurePostgresConfigured, prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function label(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function getProfile(slug: string) {
  ensurePostgresConfigured();
  const profiles = await prisma.businessProfile.findMany({
    where: { slug, approvalStatus: "APPROVED" },
    select: { organizationId: true, displayName: true, sector: true, profileKind: true, profileData: true, customFields: true },
    take: 2,
  });
  // Slugs are unique per organization; a path containing only the slug must not
  // accidentally publish an arbitrary tenant's content if two organizations collide.
  return profiles.length === 1 ? profiles[0] : null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getProfile(slug);
  if (!profile) return { title: "Profile not found · FaidATech", robots: { index: false, follow: false } };
  const custom = object(profile.customFields);
  const sectorName = profile.sector === "OTHER" ? label(custom.customSectorName) || "Other" : profile.sector.replaceAll("_", " ").toLowerCase();
  return { title: `${profile.displayName} · FaidATech`, description: `${profile.displayName} · ${sectorName}`, robots: { index: true, follow: true } };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const profile = await getProfile(slug);
  if (!profile) notFound();
  const hidePromotionalFooter = await shouldHidePublicPromoFooter(profile.organizationId);
  const profileData = object(profile.profileData);
  return <PublicVisitorLayout title={profile.displayName} hidePromotionalFooter={hidePromotionalFooter}><PublicSectorProfile
    slug={slug}
    displayName={profile.displayName}
    sector={profile.sector}
    profileKind={profile.profileKind}
    profileData={profileData}
    customFields={object(profile.customFields)}
  /></PublicVisitorLayout>;
}
