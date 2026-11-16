import type { Metadata } from "next";
import PublicDemoExperience from "@/components/demo/PublicDemoExperience";

export const metadata: Metadata = {
  title: "FaidATech — Public Demo",
  description: "A read-only FaidATech interface demonstration using synthetic sample data.",
  robots: { index: false, follow: false },
};

export default function PublicDemoPage() {
  return <PublicDemoExperience />;
}
