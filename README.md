# FaidATech

FaidATech is a tenant-aware dynamic QR platform built with Next.js App Router, TypeScript, Tailwind CSS, Prisma, Zod, and PostgreSQL.

## Local setup

1. Install dependencies with `pnpm install`.
2. Copy `.env.example` to `.env.local` and set `POSTGRES_URL` to an external PostgreSQL DSN and `APP_BASE_URL` to the public application origin.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` through a secure environment manager. Enable Email/Password and Google in Supabase Auth.
4. Generate Prisma Client with `pnpm db:generate`.
5. Apply the initial migration to the selected PostgreSQL database with `pnpm db:migrate` (development) or `pnpm db:deploy` (deployment).
6. Run the development server with `pnpm dev`.

`APP_BASE_URL` must be a public origin without a path and is used for QR destinations. Supabase OAuth callback redirects use the current app origin. Add `http://localhost:3000/api/auth/callback` to Supabase Auth's Redirect URLs allowlist for local testing; Google provider setup also needs the Supabase callback URI `https://<project-ref>.supabase.co/auth/v1/callback` in Google Cloud's Authorized redirect URIs.

## PostgreSQL connection note

The Prisma schema uses PostgreSQL through `POSTGRES_URL`. The managed Webdev database capability is MySQL-compatible and cannot serve this schema. Configure an external PostgreSQL DSN before applying migrations or using database-backed APIs. The checked-in `.env.example` contains placeholders only; never commit real credentials.
For Supabase from an IPv4-only runtime, use the Shared Pooler Session URL from its Connect dialog (port 5432, project-qualified username); the application Prisma client and `pnpm db:*` migration/status commands enforce `sslmode=require` without logging the DSN. The `pnpm db:status` command checks migration state without applying changes.

## Authentication and tenant scope

Dashboard pages are protected by the Next.js proxy and Supabase's verified SSR session. Login supports Email/Password and Google Sign-In through Supabase Auth; the `/api/auth/callback` route exchanges PKCE codes and returns users to the dashboard. The first verified Supabase user is provisioned as the owner of a FaidATech organization; later requests resolve that verified user ID to its existing membership. Client-provided organization IDs are never trusted for QR queries.

## Dashboard flows

- `/dashboard` shows QR and scan totals for the authenticated organization.
- The authenticated dashboard uses a responsive sidebar, keyboard-accessible mobile navigation, breadcrumb trail, and deterministic back links across its six workspace pages and QR builder.
- `/dashboard/create` provides a multi-step QR wizard for vCards, Restaurant Menus, Tourism & Heritage Guides, PDFs, local checkout URLs, and custom landing pages, with a live mobile preview and edit mode. Each QR may save a custom brand name, accent color, contrast-checked QR ink, and hosted logo URL.
- `/dashboard/qrcodes` lists tenant records and scan counts, shows active/paused/expired states, and offers SVG/PNG downloads, edit, pause/resume, copy-link, and soft-delete actions. The list supports server-side search and offset pagination beyond 100 records.
- `/dashboard/analytics` summarizes organization-wide scan totals and the most-scanned codes. `/dashboard/campaigns`, `/dashboard/integrations`, and `/dashboard/settings` provide organization-scoped dashboard views.

## QR endpoints and visitor experiences

- `POST /api/qrcodes` creates a tenant-scoped QR record and returns its public `/r/[shortCode]` URL and PNG data URL.
- `GET /api/qrcodes?limit=50&offset=0&search=...` lists non-deleted records for the caller's organization, including per-code scan counts. It returns pagination metadata, workspace totals, and top-scan summary data; `limit` is at most 100. Search is optional and applies to titles and short codes.
- `GET /api/qrcodes/[id]` and `PATCH /api/qrcodes/[id]` read or update records within that organization.
- `DELETE /api/qrcodes/[id]` soft-deletes a record and deactivates it.
- `GET /api/qrcodes/[id]/image?format=svg|png` downloads a tenant-scoped QR image.
- `POST /api/assets` accepts an authenticated multipart `file` upload (PNG, JPEG, or WebP up to 2 MiB), stores it under the verified organization's project-storage prefix, and returns a stable `/manus-storage/...` path. Never expose the platform service credential or temporary presigned URL.
- `GET /api/r/[shortCode]` returns dynamic payload JSON or HTTP 302 for direct URL/PDF destinations.
- `/r/[shortCode]` renders mobile visitor views for dynamic payloads: contact cards with `.vcf` downloads, interactive menu category filters and ETB pricing, and multilingual audio guides with transcripts, location links, and media. Direct URL and PDF destinations redirect to their configured target.
- `GET /api/r/[shortCode]/vcard` returns a contact file for active, unexpired vCard records.

Scan analytics are scheduled after the response. Raw IP addresses are never persisted; IPs are stored only as HMAC-SHA256 hashes using the dedicated `SCAN_IP_HASH_SECRET`. When that key is not configured, no IP hash is stored. Location uses supported edge headers only. A live PostgreSQL DSN and a configured `APP_BASE_URL` are required for database operations and QR image generation.

Per-QR branding is stored inside the validated destination payload and is rendered by the visitor experience. QR SVG/PNG exports retain a white background and high error correction; customized foreground ink must meet at least 4.5:1 contrast against white. Logo uploads are durable project assets referenced by their stable storage path; the storage runtime has no deletion operation, so uploaded files are not automatically removed when a QR is edited or soft-deleted.
