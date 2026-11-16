import { redirect } from "next/navigation";
import LoginExperience from "@/components/auth/LoginExperience";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  let signedIn = false;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    signedIn = Boolean(user);
  } catch {
    // Keep the login form available; it presents configuration/authentication errors on submit.
  }
  if (signedIn) redirect("/dashboard");
  return <LoginExperience signInFailed={Boolean(params.error)} />;
}
