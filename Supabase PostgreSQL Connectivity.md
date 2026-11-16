# Supabase PostgreSQL Connectivity

This note records the application configuration and operational status. The actual connection string and public origins remain in scoped project environment secrets and are intentionally not copied here.

## Verified state

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
