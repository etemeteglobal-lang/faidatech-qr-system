export type SupabaseConfiguration = { url: string; anonKey: string };

export function getSupabaseConfiguration(): SupabaseConfiguration | null {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!rawUrl || !anonKey) return null;

  try {
    const parsed = new URL(rawUrl);
    if (!['https:', 'http:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) return null;
    if (parsed.pathname !== '/' || parsed.search || parsed.hash) return null;
    return { url: parsed.origin, anonKey };
  } catch {
    return null;
  }
}
