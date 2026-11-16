import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function getTlsRequiredPostgresUrl(): string | undefined {
  const configuredUrl = process.env.POSTGRES_URL;
  if (!configuredUrl) return undefined;

  try {
    const url = new URL(configuredUrl);
    if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
      return configuredUrl;
    }

    // Require TLS for Supabase and other external PostgreSQL connections.
    url.searchParams.set("sslmode", "require");
    return url.toString();
  } catch {
    // Leave malformed values to Prisma's validator; never echo the DSN.
    return configuredUrl;
  }
}

const datasourceUrl = getTlsRequiredPostgresUrl();
const prismaLog: Array<"error" | "warn"> =
  process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];

function createPrismaClient(): PrismaClient {
  if (datasourceUrl) {
    return new PrismaClient({
      datasources: { db: { url: datasourceUrl } },
      log: prismaLog,
    });
  }

  return new PrismaClient({ log: prismaLog });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export function ensurePostgresConfigured(): void {
  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL is not configured");
  }
}
