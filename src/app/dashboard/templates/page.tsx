import { redirect } from "next/navigation";

export default function TemplatesDashboardPage() {
  redirect("/dashboard/create?pillar=profiles");
}
