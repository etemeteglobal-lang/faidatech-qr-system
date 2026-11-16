# Supabase PostgreSQL TLS diagnostics

Captured 2026-11-14 for the FaidATech Development Session Pooler check.

## Direct observations

- Prisma `migrate status` reached the configured Session Pooler hostname and port, then failed before authentication with P1011: “No credentials are available in the security package” (Windows error `-2146893042`). No migration was applied.
- A separate PostgreSQL SSLRequest/TLS-only probe, which sent no database credentials and no SQL, received PostgreSQL's SSL-accepted byte and negotiated TLS 1.3. Strict Node certificate verification failed with `SELF_SIGNED_CERT_IN_CHAIN`.
- A second certificate-only inspection did not trust the certificate and sent no database credentials or SQL. It observed subject CN `*.pooler.supabase.com`, SANs for `*.pooler.supabase.com` and `*.pooler.supabase.co`, issuer `Supabase Intermediate 2021 CA`, and a validity end date in 2030. This is not proof of database authentication or of the certificate chain's trustworthiness.

## Official Supabase guidance

- Supabase documents that `sslmode=require` encrypts but does not verify the server certificate or hostname. `verify-ca` validates the CA; `verify-full` validates both the CA and hostname. Supabase recommends using the database CA certificate with `verify-full` where certificate verification is required.
- The database CA certificate is downloadable from the project's Dashboard under Database Settings / SSL Configuration. The `psql` example uses the Session Pooler URL with `sslmode=verify-full` and `sslrootcert=<downloaded certificate path>`.
- Supabase's connection guide states that shared-pooler port 5432 is session mode; copy the host and connection details from the Dashboard's Connect panel.

## Sources

- https://supabase.com/docs/guides/platform/ssl-enforcement
- https://supabase.com/docs/guides/database/connecting-to-postgres
- https://supabase.com/docs/guides/database/psql

## Prisma-specific guidance

- This project uses Prisma ORM v6.19.3. The official v6 PostgreSQL guide lists `sslmode`, `sslcert`, `sslrootcert`, and `sslaccept`; certificate paths resolve relative to the `prisma` directory. The official Prisma TLS troubleshooting article says Prisma v6's Rust query engine accepts invalid certificates by default; to validate a private CA, set `sslaccept=strict` and provide the provider's root certificate (`sslcert`/root-cert URL configuration) rather than bypassing certificate checks.
- Do not use `sslaccept=accept_invalid_certs` or `NODE_TLS_REJECT_UNAUTHORIZED=0` as a fix. Those settings remove server-certificate validation and make a man-in-the-middle attack possible.
- Prisma's Node-driver-adapter examples apply to Prisma 7/`@prisma/adapter-pg`; this project is Prisma 6, so its v6 URL-based TLS behavior is the applicable guidance.

Sources:

- https://www.prisma.io/docs/orm/v6/overview/databases/postgresql
- https://www.prisma.io/docs/orm/v6/prisma-schema/overview/data-sources#securing-database-connections
- https://www.prisma.io/postgres/ssl-connection-error
- https://supabase.com/docs/guides/database/prisma
- https://supabase.com/docs/guides/database/prisma/prisma-troubleshooting

## Follow-up verification (2026-11-14)

- The user supplied Supabase Root 2021 CA certificate was initially saved as `supabase-ca.crt.crt` by Windows extension handling; it was renamed to the intended `prisma/supabase-ca.crt`. Its subject is `Supabase Root 2021 CA`, it is a CA certificate, and its SHA-256 fingerprint is `80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`. A credential-free PostgreSQL SSLRequest negotiated TLS 1.3 and Node strict verification authorized the server chain through `Supabase Intermediate 2021 CA` to this root.
- Prisma ORM v6 documentation confirms `sslcert` is the server/root certificate setting and certificate paths resolve relative to `./prisma`. Both `prisma.ts` and `scripts/prisma-with-tls.mjs` now enforce `sslmode=require`, `sslaccept=strict`, and the project-root CA path; the CLI wrapper explicitly selects `prisma/schema.prisma`. The wrapper passes Node syntax validation.
- The Prisma CLI status check found the CA file but still returned P1011: `No credentials are available in the security package` (Windows OS error `-2146893042`). It failed before database authentication and made no writes. This is distinct from the earlier CA-file-not-found response.
- An independent PostgreSQL 18 `psql` check authenticated with `sslmode=verify-full`, the supplied root CA, and `default_transaction_read_only=on`. It reported database `postgres`, schema `public`, five expected application tables plus `_prisma_migrations`, four expected enums, and one completed migration `20261108170000_init` matching the only local migration. Counts for Organization, User, Campaign, QRCode, and ScanAnalytics were all zero. No migration was needed or applied.
- The Next.js resident service was restarted on `127.0.0.1:3000`; `/` returned HTTP 200 and `/manus-routes.json` returned valid JSON with 11 page routes.
- A fresh TypeScript/Prisma validation attempt hit `EPERM` opening installed files under `node_modules`. The previously authorized recursive Modify grant was attempted within that tree but Windows denied all 51,207 file updates; no ACL entries were changed. `pnpm` was not on the current shell PATH and Corepack could not fetch it in the restricted attempt.

## Validation follow-up (2026-11-14 15:37)

The direct `node_modules/.bin` invocation encountered `EPERM`, but the project checks succeeded through the pinned Corepack entry point after network access was allowed: `pnpm typecheck` passed, and `pnpm exec prisma validate --schema prisma/schema.prisma` passed for the canonical Prisma schema. The standalone locale validator also passed for 13 catalogs and 458 keys. The earlier direct-shim access error and failed ACL grant do not prevent these Corepack checks. Prisma's read-only migration-status command remains blocked by P1011 on Windows; the independent `psql` status verification above remains valid.


## Focused Supabase Auth implementation (2026-11-15)
The app now uses `@supabase/ssr` cookie-backed browser/server clients, `auth.getUser()` for verified identities, `exchangeCodeForSession` for the callback, and Supabase Auth for sign-out. Email confirmation and Google OAuth redirect to `/api/auth/callback`; the Supabase Redirect URLs allowlist must include `http://localhost:3000/api/auth/callback` for local testing. Provider credentials remain configured in Supabase Auth, not in app source. Official sources: https://supabase.com/docs/guides/auth/server-side/creating-a-client ; https://supabase.com/docs/guides/auth/social-sign-in/auth-google ; https://supabase.com/docs/guides/auth/redirect-urls.
