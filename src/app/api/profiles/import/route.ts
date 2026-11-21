import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { apiErrorResponse, ApiError } from "@/lib/api/errors";
import { requireTenantContext } from "@/lib/auth/tenant-context";
import { ensurePostgresConfigured, prisma } from "@/lib/prisma";
import { parseCsv } from "@/lib/templates/csv";
import { getTemplate, validateProfileSubmission, verticalTemplates, type ProfileSubmission } from "@/lib/templates/registry";
import { catalogs, type MessageKey } from "@/i18n/messages";
import { resolveLocaleCode, type LocaleCode } from "@/i18n/registry";

export const runtime = "nodejs";

function slugify(name: string) {
  const value = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "profile";
  return `${value}-${randomBytes(3).toString("hex")}`;
}

function sameHeader(value: string, candidates: string[]) {
  const normalized = value.trim().toLowerCase();
  return candidates.some((candidate) => candidate.trim().toLowerCase() === normalized);
}

function localizedLabels(locale: LocaleCode, key: MessageKey) {
  return [catalogs[locale][key], catalogs.en[key]];
}

function csvCell(row: Record<string, string>, canonical: string, labelKey: MessageKey, locale: LocaleCode) {
  return Object.entries(row).find(([header]) => sameHeader(header, [canonical, ...localizedLabels(locale, labelKey)]))?.[1];
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const tenant = await requireTenantContext(request);
    if (tenant.role === "AGENT") throw new ApiError(403, "forbidden", "Field agents cannot bulk import organization profiles.");
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("text/csv")) throw new ApiError(415, "unsupported_media_type", "Send a text/csv request body.");
    const locale = resolveLocaleCode(request.headers.get("x-faida-locale")) ?? "en";
    const table = parseCsv(await request.text());
    if (!table.rows.length) throw new ApiError(400, "empty_csv", "CSV must include a header and at least one data row.");
    const validRows: ProfileSubmission[] = [];
    const errors: Array<{ row: number; message: string }> = [];
    for (let index = 0; index < table.rows.length; index += 1) {
      const row = Object.fromEntries(table.headers.map((key, column) => [key, table.rows[index][column]]));
      try {
        const sectorValue = String(csvCell(row, "sector", "templates.csvSector", locale) ?? "").trim();
        const template = getTemplate(sectorValue) ?? verticalTemplates.find((item) => sameHeader(sectorValue, [
          item.label,
          catalogs[locale][`template.sector.${item.code}` as MessageKey],
          catalogs.en[`template.sector.${item.code}` as MessageKey],
        ]));
        if (!template) throw new Error("Choose a registered sector name or code.");

        // Keep accepting the earlier JSON-column format, but simple localized field headings are now supported too.
        const profileData = row.profileDataJson ? JSON.parse(String(row.profileDataJson)) as Record<string, unknown> : {};
        const customFields = row.customFieldsJson ? JSON.parse(String(row.customFieldsJson)) as Record<string, unknown> : {};
        const standardHeaders = new Set([
          "profiledatajson", "customfieldsjson",
          "sector", "profilekind", "displayname",
          ...localizedLabels(locale, "templates.csvSector"),
          ...localizedLabels(locale, "templates.profileKind"),
          ...localizedLabels(locale, "templates.displayName"),
        ].map((header) => header.trim().toLowerCase()));
        for (const [column, value] of Object.entries(row)) {
          const text = String(value ?? "").trim();
          if (!text || standardHeaders.has(column.trim().toLowerCase())) continue;
          if (column.slice(0, "custom:".length).toLowerCase() === "custom:") {
            const name = column.slice("custom:".length).trim();
            if (!name || name.length > 80) throw new Error("A custom detail column needs a name of 1 to 80 characters.");
            customFields[name] = text;
            continue;
          }
          const field = template.fields.find((key) => sameHeader(column, [
            key,
            catalogs[locale][`template.field.${key}` as MessageKey],
            catalogs.en[`template.field.${key}` as MessageKey],
          ]));
          if (!field) throw new Error(`“${column}” is not a detail for ${template.label}. Use one of the visible sector details or a custom:Name column.`);
          profileData[field] = text;
        }

        const kindValue = String(csvCell(row, "profileKind", "templates.profileKind", locale) || "ORGANIZATION");
        const kindLabels: Record<string, MessageKey> = { INDIVIDUAL: "templates.individual", ORGANIZATION: "templates.organization", GOVERNMENT: "templates.government", GROUP: "templates.group" };
        const profileKind = Object.entries(kindLabels).find(([code, key]) => sameHeader(kindValue, [code, ...localizedLabels(locale, key)]))?.[0] ?? kindValue;
        const candidate = {
          sector: template.code,
          profileKind,
          displayName: csvCell(row, "displayName", "templates.displayName", locale),
          profileData,
          customFields,
        };
        const checked = validateProfileSubmission(candidate);
        if (!checked.success) throw new Error("Check the sector, profile type, display name, and details.");
        validRows.push(checked.data);
      } catch (error) {
        errors.push({ row: index + 2, message: error instanceof Error ? error.message : "Invalid row." });
      }
    }
    if (validRows.length) {
      ensurePostgresConfigured();
      await prisma.$transaction(async (tx) => {
        await tx.businessProfile.createMany({ data: validRows.map((data) => ({
          organizationId: tenant.organizationId,
          createdByUserId: tenant.userId,
          sector: data.sector,
          profileKind: data.profileKind,
          displayName: data.displayName,
          slug: slugify(data.displayName),
          approvalStatus: "DRAFT",
          profileData: data.profileData as Prisma.InputJsonObject,
          customFields: data.customFields as Prisma.InputJsonObject,
        })) });
        await tx.ecosystemAuditLog.create({ data: { organizationId: tenant.organizationId, actorUserId: tenant.userId, action: "PROFILE_CSV_IMPORTED", entityType: "BusinessProfile", entityId: "bulk", details: { createdCount: validRows.length, rejectedCount: errors.length } } });
      });
    }
    return Response.json({ data: { createdCount: validRows.length, rejectedCount: errors.length, errors } }, { status: errors.length ? 207 : 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiErrorResponse(error); }
}
