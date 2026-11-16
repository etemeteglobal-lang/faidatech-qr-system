import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/errors";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) return apiErrorResponse(error);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
