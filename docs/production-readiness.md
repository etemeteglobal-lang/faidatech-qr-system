# Production readiness notes

## Billing and webhooks

`POST /api/billing/checkout` requires a Supabase-authenticated tenant session, a valid active `Plan` record, and an `Idempotency-Key` header. The checkout redirect is only a handoff: it never activates a subscription. Subscription state and `PlanQuota` are changed only by a signature-verified provider event at `POST /api/billing/webhook`. Configure `BILLING_PROVIDER_BASE_URL`, `BILLING_PROVIDER_SECRET`, and `BILLING_WEBHOOK_SECRET` as protected runtime secrets. Provider plan IDs are matched to the global `Plan` table; event metadata must identify the organization and is never used to map one tenant's plan to another tenant.

A custom authentication domain is optional. The application continues to use the Supabase project URL and hosted provider domains until the owner has a custom domain.

## Consent, privacy, and retention

Necessary authentication/security cookies remain available. Optional analytics is disabled until the visitor opts in. The banner stores only the preference and selected retention window in browser local storage. The application must enforce the selected retention window in the scheduled analytics cleanup job or database policy before enabling a production analytics vendor. Do not place provider scripts before consent.

## Encrypted backup and PITR runbook

Enable Supabase Point-in-Time Recovery on the production project and confirm the retention window matches the data retention policy. Schedule encrypted logical backups with `pg_dump --format=custom --no-owner --no-acl`; encrypt the output with a managed KMS key (or an equivalent envelope-encryption workflow) before storing it in a separate private bucket. Keep backup credentials outside the repository, test a restore into an isolated project at least quarterly, and record the restore timestamp and schema version. Never run the unapplied billing migration against the live database without a reviewed maintenance window and a verified backup.

## Translation review status

All 13 locale catalogs pass key and interpolation validation. English is the authoritative source. Non-English catalogs are machine drafts and require native-speaker review; no catalog is certified error-free. Reviewers should check consent, billing, error, accessibility, and retention language in context, including Arabic RTL layout, before changing `reviewStatus` to `native_reviewed`.

## Accessibility

The UI uses darkened emerald text for small links/actions, navy headings, visible focus outlines, semantic labels, and a 4.5:1 QR foreground contrast floor. Before release, run axe/keyboard checks at 200% zoom and verify WCAG 2.2 AA contrast for every translated string and state color.
