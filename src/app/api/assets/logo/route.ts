import { NextRequest } from "next/server";
import { POST as uploadProfileAsset } from "@/app/api/profile-assets/route";
export const runtime = "nodejs";
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const form = await request.formData();
    const headers = new Headers(request.headers);
    headers.delete("content-type");
    headers.delete("content-length");
    form.set("purpose", "logo");
    return uploadProfileAsset(new NextRequest(request.url, { method: "POST", headers, body: form }));
  } catch {
    return Response.json({ error: { code: "invalid_multipart", message: "Provide a multipart form with a logo image." } }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
