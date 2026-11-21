# Phase 2 data and delivery notes

## Relational ownership with JSONB extensions

The schema keeps organization ID, actor IDs, vertical sector, profile kind, approval state, agent identity, timestamps, service publication state, and product/asset identifiers in typed PostgreSQL columns. Extensible profile data uses `BusinessProfile.profileData` and `customFields`; shared service payloads, traceability origin data, verification metadata, payment attachment metadata, maintenance details, and audit details are JSONB. API code always supplies `organizationId` from the verified Supabase membership and never accepts it from a request body.

For containment queries such as `WHERE "profileData" @> '{"licenseType":"ECA"}'`, a GIN index with `jsonb_path_ops` is appropriate. For common exact filter keys, use expression B-tree indexes. For frequently queried approved records, use partial indexes. The additive migration includes a GIN containment index for business-profile data, an expression B-tree example for professional licences, and a partial approval-queue index; it does not apply itself to a database.

```sql
-- JSON containment (@> only): compact GIN operator class
CREATE INDEX "BusinessProfile_profileData_path_gin"
  ON "BusinessProfile" USING GIN ("profileData" jsonb_path_ops);

-- Exact query/filter/sort on a frequently-used JSON field
CREATE INDEX "BusinessProfile_license_expr_idx"
  ON "BusinessProfile" (("profileData" ->> 'professionalLicense'));

-- Keep the hot approval queue narrow
CREATE INDEX "BusinessProfile_pending_queue_idx"
  ON "BusinessProfile" ("organizationId", "updatedAt" DESC)
  WHERE "approvalStatus" = 'PENDING_APPROVAL';
```

The first index is only for supported containment operations and is not a substitute for typed columns or expression indexes. Do not add a JSON GIN index blindly to every JSONB field; measure actual query patterns and write overhead first.

## Shared services, bandwidth, and QR output

Public shared-service payloads are limited to 128 KiB by the API, contain locale-keyed text and stable media references, and are exposed only after publication. The public endpoint uses cache headers based on the record's configured short TTL. Audio elements use `preload="none"`; images use lazy loading. The public service worker caches only published service responses and provides network-first refresh with a cached offline copy. QR SVGs retain a four-module quiet zone and include a human-readable title, description, and scan CTA.

## Security and migration

No raw Fayda number, identity document image, payment credential, or provider key belongs in application JSON. Verification stores the provider, a non-sensitive subject reference, a one-way provider reference hash, status, timestamps, and a safe metadata allowlist. All records remain organization-scoped. Field-agent list queries add the agent ID for agent-role users; organization admins may manage the full organization scope.

The Phase 2 SQL migration is additive and is intentionally not run against Development or Production. Existing billing tables, quotas, payment state values, and QR records are not backfilled, reset, or altered.

## Source references reviewed

- Repository selected for this task: [etemeteglobal-lang/faidatech-qr-system](https://github.com/etemeteglobal-lang/faidatech-qr-system); Phase 1 implementation at baseline commit `e322132afa1fb30284e512e70db5ec749187633d`.
- Billing reference page: [FaidATech billing dashboard](https://faidatech-qr-system.vercel.app/dashboard/billing). The page presented a sign-in screen during review, so existing repository code—not an authenticated live UI—was used as the Phase 1 billing source of truth.
