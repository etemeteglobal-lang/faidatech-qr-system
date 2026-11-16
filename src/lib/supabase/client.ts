"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfiguration } from "./config";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  if (browserClient) return browserClient;
  const configuration = getSupabaseConfiguration();
  if (!configuration) throw new Error("Supabase Auth is not configured.");
  browserClient = createBrowserClient(configuration.url, configuration.anonKey);
  return browserClient;
}
