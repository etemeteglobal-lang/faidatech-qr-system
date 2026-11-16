import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeNextPath(candidate: string | null): string {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) {
    return "/dashboard";
  }
  return candidate;
}

export async function GET(request: NextRequest): Promise<Response> {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const destination = new URL(safeNextPath(request.nextUrl.searchParams.get("next")), request.nextUrl.origin);
        return NextResponse.redirect(destination);
      }
    } catch {
      // A failed or expired callback returns to the login form with a recoverable message.
    }
  }

  const login = new URL("/login?error=auth_callback", request.nextUrl.origin);
  return NextResponse.redirect(login);
}
