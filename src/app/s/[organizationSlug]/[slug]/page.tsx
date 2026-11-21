import type { Metadata } from "next";
import PublicServiceView from "@/components/shared-services/PublicServiceView";

type PageProps = { params: Promise<{ organizationSlug: string; slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { organizationSlug, slug } = await params;
  return { title: `${slug.replaceAll("-", " ")} · FaidATech`, description: `Public service guide for ${organizationSlug}.`, robots: { index: false, follow: false } };
}

export default async function SharedServicePage({ params }: PageProps) {
  const { organizationSlug, slug } = await params;
  return <PublicServiceView organizationSlug={organizationSlug} slug={slug} />;
}
