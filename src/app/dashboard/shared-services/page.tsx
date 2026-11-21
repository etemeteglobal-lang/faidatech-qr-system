import { redirect } from "next/navigation";

export default function SharedServicesDashboardPage() {
  redirect("/dashboard/create?pillar=shared");
}
