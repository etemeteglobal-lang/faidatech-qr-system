import { randomBytes } from "node:crypto";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { SignJWT } from "jose";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { getAppOrigin } from "@/lib/app-origin";
import { ensurePostgresConfigured, prisma } from "@/lib/prisma";

export const OAUTH_NONCE_COOKIE = "faidatech_oauth_nonce";

const tokenResponseSchema = z.object({ accessToken: z.string().min(1) }).passthrough();
const userInfoSchema = z
  .object({
    openId: z.string().trim().min(1),
    name: z.string().trim().nullable().optional(),
    email: z.string().trim().email().nullable().optional(),
    platforms: z.array(z.string()).optional(),
  })
  .passthrough();

export type OAuthUserProfile = z.infer<typeof userInfoSchema>;

export function getManusOAuthConfig() {
  const projectId = process.env.MANUS_PROJECT_ID;
  const portalBase = process.env.MANUS_OAUTH_PORTAL_URL;
  const apiBase = process.env.MANUS_OAUTH_API_URL;
  if (!projectId || !portalBase || !apiBase) {
    throw new ApiError(503, "oauth_not_configured", "Manus OAuth is not configured for this project.");
  }

  const origin = getAppOrigin();
  const callbackUrl = new URL("/api/auth/callback", origin).toString();
  return { projectId, portalBase: portalBase.replace(/\/+$/, ""), apiBase: apiBase.replace(/\/+$/, ""), origin, callbackUrl };
}

export function buildManusAuthorizationUrl(state: string): URL {
  const config = getManusOAuthConfig();
  const authorizationUrl = new URL(`${config.portalBase}/app-auth`);
  authorizationUrl.searchParams.set("appId", config.projectId);
  authorizationUrl.searchParams.set("redirectUri", config.callbackUrl);
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("responseType", "code");
  return authorizationUrl;
}

export function createOAuthState(nonce: string, redirectUri: string): string {
  return Buffer.from(JSON.stringify({ redirectUri, nonce }), "utf8").toString("base64");
}

export const oauthStateSchema = z
  .object({
    redirectUri: z.string().url(),
    nonce: z.string().min(32).max(128),
  })
  .strict();

function endpoint(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}${path}`;
}

export async function exchangeManusCode(code: string, redirectUri: string): Promise<string> {
  const { projectId, apiBase } = getManusOAuthConfig();
  const response = await fetch(
    endpoint(apiBase, "/webdev.v1.WebDevAuthPublicService/ExchangeToken"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: projectId,
        grantType: "authorization_code",
        code,
        redirectUri,
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new ApiError(502, "oauth_exchange_failed", "Manus could not complete the sign-in exchange.");
  }

  const tokenResponse = tokenResponseSchema.safeParse(await response.json());
  if (!tokenResponse.success) {
    throw new ApiError(502, "oauth_exchange_failed", "Manus returned an invalid sign-in response.");
  }
  return tokenResponse.data.accessToken;
}

export async function getManusUserInfo(accessToken: string): Promise<OAuthUserProfile> {
  const { apiBase } = getManusOAuthConfig();
  const response = await fetch(
    endpoint(apiBase, "/webdev.v1.WebDevAuthPublicService/GetUserInfo"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new ApiError(502, "oauth_identity_failed", "Manus could not verify the signed-in identity.");
  }

  const profile = userInfoSchema.safeParse(await response.json());
  if (!profile.success) {
    throw new ApiError(502, "oauth_identity_failed", "Manus returned an invalid user identity.");
  }
  return profile.data;
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof PrismaClientKnownRequestError && error.code === "P2002";
}

export async function ensureOrganizationMembership(profile: OAuthUserProfile) {
  ensurePostgresConfigured();

  const existing = await prisma.user.findUnique({
    where: { openId: profile.openId },
    select: { id: true, openId: true, organizationId: true },
  });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: profile.name?.slice(0, 160) ?? null,
        email: profile.email ?? null,
      },
    });
    return existing;
  }

  const displayName = profile.name?.trim().slice(0, 120) || "FaidATech";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const slug = `faida-${randomBytes(6).toString("hex")}`;
    try {
      return await prisma.$transaction(async (transaction) => {
        const organization = await transaction.organization.create({
          data: { name: `${displayName} workspace`, slug },
          select: { id: true },
        });
        return transaction.user.create({
          data: {
            openId: profile.openId,
            name: profile.name?.slice(0, 160) ?? null,
            email: profile.email ?? null,
            role: "OWNER",
            organizationId: organization.id,
          },
          select: { id: true, openId: true, organizationId: true },
        });
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const winner = await prisma.user.findUnique({
          where: { openId: profile.openId },
          select: { id: true, openId: true, organizationId: true },
        });
        if (winner) return winner;
        if (attempt < 2) continue;
      }
      throw error;
    }
  }

  throw new ApiError(500, "organization_setup_failed", "Could not create an organization for this account.");
}

export async function createManusAppSession(openId: string): Promise<string> {
  const projectId = process.env.MANUS_PROJECT_ID;
  const jwtSecret = process.env.MANUS_JWT_SECRET;
  if (!projectId || !jwtSecret) {
    throw new ApiError(503, "authentication_not_configured", "Application authentication is not configured.");
  }

  return new SignJWT({ appId: projectId, openId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(openId)
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(new TextEncoder().encode(jwtSecret));
}
