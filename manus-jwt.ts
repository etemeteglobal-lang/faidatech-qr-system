import { jwtVerify } from "jose";
import { ApiError } from "@/lib/api/errors";
import type { NextRequest } from "next/server";

export function getManusSessionToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  return bearer ?? request.cookies.get("webdev_app_session")?.value ?? null;
}

export async function verifyManusSessionToken(token: string): Promise<string> {
  const projectId = process.env.MANUS_PROJECT_ID;
  const jwtSecret = process.env.MANUS_JWT_SECRET;

  if (!projectId || !jwtSecret) {
    throw new ApiError(503, "authentication_not_configured", "Application authentication is not configured.");
  }

  let payload;
  try {
    ({ payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret), {
      algorithms: ["HS256"],
    }));
  } catch {
    throw new ApiError(401, "invalid_session", "A valid application session is required.");
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp <= now) {
    throw new ApiError(401, "expired_session", "The application session has expired.");
  }

  if (payload.appId !== projectId) {
    throw new ApiError(401, "invalid_session", "The application session is not valid for this project.");
  }

  const openId =
    typeof payload.openId === "string"
      ? payload.openId
      : typeof payload.sub === "string"
        ? payload.sub
        : null;

  if (!openId) {
    throw new ApiError(401, "invalid_session", "The application session does not identify a user.");
  }

  return openId;
}
