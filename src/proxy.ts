import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfiguration } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  const configuration = getSupabaseConfiguration();
  if (!configuration) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "?error=auth_not_configured";
    return NextResponse.redirect(login, { headers: { "Cache-Control": "no-store" } });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(configuration.url, configuration.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user) return response;
  } catch {
    // Fail closed: protected pages return the visitor to the sign-in screen.
  }

  const login = request.nextUrl.clone();
  login.pathname = "/login";
  login.search = "";
  const redirect = NextResponse.redirect(login, { headers: { "Cache-Control": "no-store" } });
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
