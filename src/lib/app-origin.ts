import { ApiError } from "@/lib/api/errors";

export function getAppOrigin(): URL {
  const configured = process.env.APP_BASE_URL;
  if (!configured) {
    throw new ApiError(503, "public_origin_not_configured", "Set APP_BASE_URL to the public application origin.");
  }

  let origin: URL;
  try {
    origin = new URL(configured);
  } catch {
    throw new ApiError(503, "invalid_public_origin", "APP_BASE_URL must be a valid public URL.");
  }

  if (
    (origin.protocol !== "https:" && origin.protocol !== "http:") ||
    (process.env.NODE_ENV === "production" && origin.protocol !== "https:") ||
    (origin.pathname !== "/" && origin.pathname !== "") ||
    origin.search ||
    origin.hash
  ) {
    throw new ApiError(503, "invalid_public_origin", "APP_BASE_URL must be a public HTTP(S) origin without a path.");
  }

  return new URL(origin.origin);
}

export function getSessionCookiePolicy() {
  const secure = getAppOrigin().protocol === "https:";
  return {
    secure,
    sameSite: secure ? ("none" as const) : ("lax" as const),
  };
}
