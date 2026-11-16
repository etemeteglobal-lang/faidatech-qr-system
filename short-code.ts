import { randomBytes } from "node:crypto";
import { ApiError } from "@/lib/api/errors";

export const SHORT_CODE_PATTERN = /^[A-Za-z0-9_-]{8,32}$/;

export function createShortCode(): string {
  return randomBytes(9).toString("base64url");
}

export function getPublicQrUrl(shortCode: string): string {
  const configuredBaseUrl = process.env.APP_BASE_URL;
  if (!configuredBaseUrl) {
    throw new ApiError(503, "public_origin_not_configured", "Set APP_BASE_URL before generating QR images.");
  }

  let base: URL;
  try {
    base = new URL(configuredBaseUrl);
  } catch {
    throw new ApiError(503, "invalid_public_origin", "APP_BASE_URL must be a valid public URL.");
  }

  if (
    (base.protocol !== "https:" && base.protocol !== "http:") ||
    (process.env.NODE_ENV === "production" && base.protocol !== "https:") ||
    (base.pathname !== "/" && base.pathname !== "") ||
    base.search.length > 0 ||
    base.hash.length > 0
  ) {
    throw new ApiError(503, "invalid_public_origin", "APP_BASE_URL must be a public HTTP(S) origin without a path.");
  }

  return new URL(`/r/${encodeURIComponent(shortCode)}`, base.origin).toString();
}
