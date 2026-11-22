# Handoff / Resume State — Sector Profiles continuation

## Implemented in this continuation
The Sector Profiles preview now renders a generated QR matrix for an existing saved profile path, with high error correction, a four-module quiet zone, square/rounded modules, safe dark-on-light ink fallback, square/rounded/brand frame styling, optional uploaded logo positioned center/top/bottom, SVG download and print. Controls update the rendered code. A code points to the approved-profile route; public destination resolves only after approval.

Profile custom social values now persist with their item type and platform metadata. The approved-profile page renders wide platform showcase cards after validating URL protocols and platform hostnames. It also renders available spotlight, quick action, review prompt, and entered rating values. Direct PDF/image uploads and QR logo uploads use the shared quota-reservation endpoint. The legacy logo API now forwards to that quota-aware endpoint, and the editor can show PlanQuota counter usage and link to the existing billing page when the quota is hit. Billing checkout logic remains unchanged.

Profile save/update handlers now return a distinct localized storage-unavailable status for Prisma missing-table/column errors rather than a generic server response. The editor preserves inputs and shows localized save/load feedback. This is error handling, not a database repair.

## Verification
On 2026-11-22, `POSTGRES_URL='postgresql://postgres:postgres@127.0.0.1:5432/postgres?schema=public' npx prisma validate --schema prisma/schema.prisma`, `npm exec tsc -- --noEmit`, `npm run lint`, `npm run validate:i18n`, `npm run build`, and `git diff --check` passed. Lint reports warnings only (32 warnings, 0 errors). i18n validation reports 13 locales and 934 keys; translations remain machine drafts and none have native-speaker approval.

## Runtime and safety caveats
No live database was queried, no migration/reset/RLS change/secret rotation was performed, and no push or deployment was performed. Therefore the reported live save/load issue is not runtime-verified here. If the profile tables or required columns are absent, the existing additive Phase 2 migration must be applied through the normal authorized process before persistence can work; this request prohibited live migrations. The `OTHER` sector enum addition remains in its own additive migration and is also unapplied. Existing storage counters are the basis for quota enforcement; historical objects/usage have not been reconciled, so do not claim the counter represents complete historical storage usage.

Some profile-editor and public-page copy still needs a full localization pass/native review. The social platform cards and profile URL were build-checked, not browser/scanner-tested against a live approved profile. Public slug collisions across organizations intentionally return not-found.

## Local handoff
Extract the ZIP over the matching repository revision, inspect the full diff and the unapplied migrations, then test with an authorized staging database after migration approval. Only then push the reviewed changes to `origin/main`. Do not deploy or run migrations from this sandbox.
