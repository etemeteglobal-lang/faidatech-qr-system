# Supabase PostgreSQL Connectivity

This note records the application configuration and operational status. The actual connection string and public origins remain in scoped project environment secrets and are intentionally not copied here.

## Current task status (2026-11-14)

- The current managed Webdev resource reports protected `POSTGRES_URL` and `APP_BASE_URL` configured only in `dev`, with `runtime_sync` applied. Their values are not copied into this repository.
- The public Supabase Root 2021 CA is stored at `prisma/supabase-ca.crt`. A credentials-free TLS probe verified the presented pooler chain with TLS 1.3. Prisma runtime and CLI configuration require TLS, strict certificate validation, and this CA file; the CLI wrapper explicitly selects `prisma/schema.prisma`.
- An independent PostgreSQL 18 `psql` check authenticated to the Development Session Pooler using `sslmode=verify-full`, the CA file, and a read-only transaction. It found the five expected FaidATech tables, `_prisma_migrations`, the four expected enums, and the completed migration `20261108170000_init`. The local migrations folder contains only that migration; each application table has zero rows. No migration was needed or applied during this task. Supabase recommends CA-backed certificate verification, and Prisma ORM v6 documents strict TLS with its root certificate setting ([Supabase SSL enforcement](https://supabase.com/docs/guides/platform/ssl-enforcement); [Prisma v6 PostgreSQL TLS](https://www.prisma.io/docs/orm/v6/overview/databases/postgresql)).
- Prisma's own read-only `migrate status` still fails before database authentication with P1011 (`No credentials are available in the security package`, Windows error `-2146893042`) after the CA file is found. Thus the database is independently verified, but Prisma-engine TLS operations remain blocked in this Windows environment. No migration write was issued.
- The resident Next.js server responds on `127.0.0.1:3000` with HTTP 200; `/manus-routes.json` returns valid JSON with 11 routes. The catalog validator passes for 13 locales and 458 keys. The frozen-lockfile install and Prisma Client generation succeeded earlier; the latest pinned Corepack `pnpm typecheck` and `pnpm exec prisma validate --schema prisma/schema.prisma` both pass.

## Historical verified state (2026-11-10–2026-11-12)

- A Supabase Session Pooler PostgreSQL DSN is configured as `POSTGRES_URL`. Prisma runtime connections and CLI migration commands require TLS (`sslmode=require`).
- A read-only Prisma connection check succeeded. The target `public` schema was confirmed to contain no conflicting FaidATech tables, enums, or migration history before the initial migration was applied.
- Migration `20261108170000_init` is applied. The five expected FaidATech tables exist, contain zero application rows, and `pnpm db:status` reports the database schema up to date.
- A read-only request for an unknown QR short code returned HTTP 404 rather than a database-configuration error. No test QR records were inserted.

## Origin and publication scope

The current project Preview origin is configured as a Development-only `APP_BASE_URL` override. The existing all-environments fallback remains in effect for Production and has not been confirmed as the intended production custom domain. Do not assume that value should be used for production OAuth callbacks or public QR links. Auto-publish is off, and no publication has occurred.

Configuration history: database connectivity and the empty-schema migration were verified during the November 10–11, 2026 session; the Development-only Preview-origin override was applied November 11; the running site and read-only unknown-code route were checked again November 12.

## Operating guidance

Keep real credentials out of the repository and use the project’s secure environment-secret workflow for replacements. The checked-in `.env.example` contains placeholders only. Do not run migrations against a different database without confirming that the target schema has no conflicting FaidATech objects or migration history.

## Supabase references

- [Supabase: Connect to your database](https://supabase.com/docs/guides/database/connecting-to-postgres) — connection modes, ports, and obtaining the project-specific connection URL.
- [Supabase: Dedicated IPv4 Address for Ingress](https://supabase.com/docs/guides/platform/ipv4-address) — IP-version behavior and IPv4-compatible alternatives.
