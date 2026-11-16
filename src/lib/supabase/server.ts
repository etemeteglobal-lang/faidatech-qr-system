import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ApiError } from "@/lib/api/errors";
import { getSupabaseConfiguration } from "./config";

export async function createClient() {
  const configuration = getSupabaseConfiguration();
  if (!configuration) {
    throw new ApiError(503, "supabase_auth_not_configured", "Supabase Auth is not configured for this application.");
  }

  const cookieStore = await cookies();
  return createServerClient(configuration.url, configuration.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot write cookies; the Next.js Proxy refreshes sessions.
        }
      },
    },
  });
}
