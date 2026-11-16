import type { NextRequest } from "next/server";
import { resolveQrRequest } from "@/lib/qr/resolve-request";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ shortCode: string }>;
};

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  const { shortCode } = await context.params;
  return resolveQrRequest(request, shortCode);
}
