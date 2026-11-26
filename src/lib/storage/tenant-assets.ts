import { createClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";

const BUCKET = "assets";
const TENANT_ROOT = "faidatech";
const LIST_PAGE_SIZE = 1000;

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export function createAssetStorageClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new ApiError(503, "storage_not_configured", "Storage credentials are not configured.");
  }
  return createClient(supabaseUrl, serviceRoleKey);
}

function tenantPrefix(organizationId: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(organizationId)) {
    throw new ApiError(500, "storage_key_unavailable", "Could not create a safe tenant storage key.");
  }
  return `${TENANT_ROOT}/${organizationId}/`;
}

/** Returns a bucket key only for a public URL belonging to this project's tenant prefix. */
export function tenantAssetKeyFromUrl(value: unknown, organizationId: string): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  try {
    const assetUrl = new URL(value);
    const projectUrl = new URL(supabaseUrl);
    const objectPath = "/storage/v1/object/public/assets/";
    if (assetUrl.origin !== projectUrl.origin || !assetUrl.pathname.startsWith(objectPath)) return null;
    const key = decodeURIComponent(assetUrl.pathname.slice(objectPath.length));
    if (!key.startsWith(tenantPrefix(organizationId))) return null;
    const segments = key.split("/");
    if (segments.some((segment) => !segment || segment === "." || segment === ".." || segment.includes("\\"))) return null;
    return key;
  } catch {
    return null;
  }
}

function collectKeys(value: unknown, organizationId: string, keys: Set<string>, depth = 0): void {
  if (depth > 32) return;
  if (typeof value === "string") {
    const key = tenantAssetKeyFromUrl(value, organizationId);
    if (key) {
      keys.add(key);
    } else if (/^\s*[\[{]/.test(value)) {
      try {
        collectKeys(JSON.parse(value) as unknown, organizationId, keys, depth + 1);
      } catch {
        // Ordinary text that is not JSON contains no recursively encoded asset record.
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, organizationId, keys, depth + 1);
    return;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) collectKeys(item, organizationId, keys, depth + 1);
  }
}

export function collectTenantAssetUrls(values: unknown[], organizationId: string): Set<string> {
  const urls = new Set<string>();
  const visit = (value: unknown, depth = 0): void => {
    if (depth > 32) return;
    if (typeof value === "string") {
      if (tenantAssetKeyFromUrl(value, organizationId)) {
        urls.add(value);
      } else if (/^\s*[\[{]/.test(value)) {
        try {
          visit(JSON.parse(value) as unknown, depth + 1);
        } catch {
          // Ordinary text that is not JSON contains no recursively encoded asset record.
        }
      }
    } else if (Array.isArray(value)) {
      value.forEach((item) => visit(item, depth + 1));
    } else if (value && typeof value === "object") {
      Object.values(value as Record<string, unknown>).forEach((item) => visit(item, depth + 1));
    }
  };
  values.forEach(visit);
  return urls;
}

async function listTenantObjects(organizationId: string): Promise<{ key: string; size: number }[]> {
  const prefix = tenantPrefix(organizationId).slice(0, -1);
  const storage = createAssetStorageClient().storage.from(BUCKET);
  const objects: { key: string; size: number }[] = [];

  async function visit(folder: string): Promise<void> {
    let offset = 0;
    for (;;) {
      const { data, error } = await storage.list(folder, { limit: LIST_PAGE_SIZE, offset });
      if (error) {
        throw new ApiError(503, "storage_reconciliation_failed", "Workspace storage could not be synchronized with the storage service.");
      }
      const entries = data ?? [];
      for (const entry of entries) {
        if (!entry.name || entry.name === "." || entry.name === "..") continue;
        const key = `${folder}/${entry.name}`;
        if (entry.id === null) {
          await visit(key);
          continue;
        }
        const size = Number(entry.metadata?.size ?? entry.metadata?.contentLength);
        if (!Number.isSafeInteger(size) || size < 0) {
          throw new ApiError(503, "storage_reconciliation_failed", "A stored file did not include valid size metadata, so workspace usage was not changed.");
        }
        objects.push({ key, size });
      }
      if (entries.length < LIST_PAGE_SIZE) break;
      offset += LIST_PAGE_SIZE;
    }
  }

  await visit(prefix);
  return objects;
}

export async function reconcileTenantStorageUsage(organizationId: string, planId: string): Promise<bigint> {
  const objects = await listTenantObjects(organizationId);
  const storageBytesUsed = objects.reduce((total, object) => total + BigInt(object.size), BigInt(0));
  await prisma.planQuota.update({
    where: { organizationId_planId: { organizationId, planId } },
    data: { storageBytesUsed },
  });
  return storageBytesUsed;
}

async function getReferencedTenantAssetKeys(organizationId: string): Promise<Set<string>> {
  const [qrCodes, profiles] = await Promise.all([
    prisma.qRCode.findMany({
      where: { organizationId, deletedAt: null },
      select: { payload: true },
    }),
    prisma.businessProfile.findMany({
      where: { organizationId },
      select: { profileData: true, customFields: true },
    }),
  ]);
  const referencedKeys = new Set<string>();
  for (const qr of qrCodes) collectKeys(qr.payload as JsonValue, organizationId, referencedKeys);
  for (const profile of profiles) {
    collectKeys(profile.profileData as JsonValue, organizationId, referencedKeys);
    collectKeys(profile.customFields as JsonValue, organizationId, referencedKeys);
  }
  return referencedKeys;
}

export async function getUnreferencedTenantAssetBytes(organizationId: string, assetUrl: string | null | undefined): Promise<bigint> {
  const key = tenantAssetKeyFromUrl(assetUrl, organizationId);
  if (!key) return BigInt(0);
  const referencedKeys = await getReferencedTenantAssetKeys(organizationId);
  if (referencedKeys.has(key)) return BigInt(0);
  const objects = await listTenantObjects(organizationId);
  const object = objects.find((entry) => entry.key === key);
  return object ? BigInt(object.size) : BigInt(0);
}

/** Delete only organization-owned assets no longer referenced by any saved QR or profile record. */
export async function cleanupUnreferencedTenantAssets(organizationId: string, candidateUrls: Iterable<string>): Promise<string[]> {
  const candidateKeys = new Set<string>();
  for (const value of candidateUrls) {
    const key = tenantAssetKeyFromUrl(value, organizationId);
    if (key) candidateKeys.add(key);
  }
  if (!candidateKeys.size) return [];

  const referencedKeys = await getReferencedTenantAssetKeys(organizationId);
  const unusedKeys = [...candidateKeys].filter((key) => !referencedKeys.has(key));
  if (!unusedKeys.length) return [];

  const { error } = await createAssetStorageClient().storage.from(BUCKET).remove(unusedKeys);
  if (error) {
    throw new ApiError(502, "storage_cleanup_failed", "A replaced file could not be removed from workspace storage.");
  }
  return unusedKeys;
}
