import type { NextRequest } from "next/server";
import { POST as uploadLogo } from "@/app/api/assets/logo/route";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<Response> {
  return uploadLogo(request);
}
