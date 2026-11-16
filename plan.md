# FaidATech UI Alignment & Interactive QR Generator — Plan

## Reference review and design direction

The supplied `Document1.docx` is a six-page board containing 18 interface references (three screens per page). All six pages were reviewed. The references consistently show a light enterprise workspace: compact branded navigation, generous but disciplined content spacing, white cards on a pale neutral canvas, thin cool-grey borders, modest elevation, dark-navy headings, teal state accents, and green primary actions. The wizard uses a focused editor beside a persistent phone preview; the QR library, analytics, campaigns, integrations, and settings screens use concise headings, filter/action toolbars, metric cards, and practical tables or forms.

### Design system

- **Design Movement:** Modern African enterprise SaaS, expressed through the reference boards’ bright workspace canvas, clear data hierarchy, localized QR use cases, and restrained regional color accents.
- **Core Principles:** Keep each screen task-focused; make workspace navigation persistent and predictable; keep form changes visible in the visitor preview; prioritize legibility and keyboard/touch accessibility.
- **Color Philosophy:** Preserve the specified FaidATech tokens exactly: Primary Green `#10B981` for primary actions and success; Navy Blue `#0F172A` for hierarchy and high-contrast surfaces; Teal `#14B8A6` for informational accents and selected states; Slate Grey `#64748B` for secondary text. Use white cards and a faint cool-neutral canvas so the brand colors remain functional, not decorative.
- **Layout Paradigm:** Desktop uses a fixed, compact left rail and a flexible page canvas with a slim contextual header. Small screens use a hamburger-controlled navigation drawer with backdrop, close action, and focus-safe behavior. The QR wizard uses an editor/phone-preview split on wide screens and a deliberate stacked layout on narrow screens.
- **Signature Elements:** A green primary-action treatment; compact pill/badge states and teal selection markers; a framed phone preview that mirrors the visitor experience.
- **Interaction Philosophy:** Every visible back/breadcrumb/navigation control works and communicates its destination. Input state drives preview state immediately. Validation and upload failures remain close to the relevant control, with focus and labels intact.
- **Animation:** Use short 150–200 ms ease-out transitions for drawer, hover, selection, and loading states; respect reduced-motion preferences and avoid movement that delays task completion.
- **Typography System:** Retain the existing system sans stack for a fast, consistent SaaS interface; use compact uppercase eyebrow labels, strong page titles, readable 14–16 px body copy, and tabular numerals for metrics.
- **Brand Essence:** A practical QR workspace that helps Ethiopian and regional organizations publish, localize, and measure physical-to-digital experiences; **clear, capable, connected**.
- **Brand Voice:** Direct and useful, with concise instructions and clear actions. Examples: “Choose the experience people should see.” “Your QR stays the same—even when the destination changes.”
- **Wordmark & Logo:** Preserve the current QR-inspired four-cell mark and wordmark; use it consistently in the rail, mobile drawer, wizard identity preview, and public visitor shell rather than substituting a default-font-only label.
- **Signature Brand Color:** FaidATech Green `#10B981`.

## Implementation approach

1. **Shared navigation and page framing.** Refine `src/components/dashboard/DashboardShell.tsx` with a responsive hamburger button, accessible mobile drawer, backdrop/escape close behavior, active-route states, and a contextual workspace header. Add a shared page heading/breadcrumb/back component (under `src/components/dashboard/`) and apply it to `/dashboard`, `/dashboard/qrcodes`, `/dashboard/analytics`, `/dashboard/campaigns`, `/dashboard/integrations`, `/dashboard/settings`, and `/dashboard/create`. Breadcrumbs should reflect the current route (for example, `Home > Dashboard > Create Dynamic QR`); back controls should have deterministic in-app fallbacks rather than trapping a user when browser history is empty.
2. **Visual alignment of the workspace pages.** Reuse the same canvas, title hierarchy, spacing scale, card radii/elevation, borders, buttons, and status badges across the six dashboard destinations and the creation wizard. Preserve each page’s current capabilities and tenant-scoped data behavior; do not imply unsupported billing, geographic analytics, campaign editing, or payment functions from reference-only mockups.
3. **Per-QR identity and contrast-safe customization.** Extend wizard state and validated destination payloads with optional `brandName`, `logoUrl`, `accentColor`, and QR foreground color. Keep the saved data in the existing JSON payload (no table migration required). Add bounded, authenticated logo upload through a server route: validate tenant session, image MIME (PNG/JPEG/WebP), and size; request a presigned project-storage upload using server-only platform credentials; persist/reference the stable `/manus-storage/<key>` path, never a temporary URL or browser blob. Provide a hosted-logo URL fallback if platform upload is unavailable. Apply color validation and a contrast floor for the QR foreground against white so customization does not sacrifice scanability.
4. **Live generator preview and export integration.** Bind organization/brand name, uploaded logo, accent, QR color, title, description, vCard contact details, menu rows/prices, and tourism audio/transcript links for all 13 unique locales to immediate preview updates. Preserve existing purpose selection, form validation, edit hydration, QR creation/update API calls, success state, and mobile visitor previews. Pass saved QR customization into both SVG and PNG generation/download endpoints and return/export the generated QR from the current database-backed record. Keep the dynamic short URL as the QR payload; custom styling must not change routing semantics.
5. **Visitor-side brand continuity.** Parse and validate optional brand settings for each dynamic destination. Render the configured brand name/logo and accent in the relevant public visitor experiences while maintaining readable contrast and safe URL handling. Direct URL/PDF routes continue their current redirect behavior.
6. **Progress tracking and delivery.** After this plan is approved, update `TODO.md` with the original requested clauses as separate outcome groups before implementation. Keep items open until their behavior is present. Run configured TypeScript diagnostics, existing typecheck/build, Prisma schema validation if schemas change, route-manifest consistency and focused HTTP checks; use one read-only implementation review because this touches shared navigation, authentication-protected UI, database-backed uploads, and QR exports. Save the verified code on canonical `main`; do not publish unless separately requested/authorized by existing project settings.

## Project structure and responsibilities

- `src/components/dashboard/DashboardShell.tsx`: desktop rail, mobile drawer, workspace header, session identity, sign-out.
- `src/components/dashboard/`: shared breadcrumb/page-heading/back UI and dashboard-specific interactions.
- `src/components/dashboard/wizard/`: typed form model, payload editor, validation, and branding state.
- `src/i18n/`: locale registry, tier-grouped selector, provider, typed JSON catalogs, fallback rules, and review metadata.
- `src/app/dashboard/**`: dashboard routes and page-level layout/content.
- `src/app/api/qrcodes/**`: tenant-scoped CRUD and styled SVG/PNG QR exports.
- `src/app/api/assets/**`: authenticated bounded logo-upload endpoint backed by project object storage.
- `src/lib/qr/`: QR generation, payload schemas, contrast/color validation, URL helpers.
- `src/components/qr/`: public visitor experiences using validated optional brand settings.
- `public/manus-routes.json`: synchronized page route declarations; API routes remain excluded.

## Dependencies and constraints

The current app is Next.js App Router with TypeScript, Tailwind CSS, Prisma/PostgreSQL, Zod, and `qrcode`; no new frontend component framework is planned. Uploads use the platform object-storage presign contract server-side, so server credentials never reach browser code. Database-backed saving, organization ownership, sign-in, and existing record exports use the configured external PostgreSQL DSN and environment-scoped public `APP_BASE_URL`. The approved initial migration was applied only after confirming the target public schema was empty; this iteration's route and build checks did not create user/demo records. The provided reference is one six-page Word document with 18 visual panels, not 18 separate uploaded files; the plan uses all available panels as visual guidance.


# Multilingual Engine and PostgreSQL Runtime Readiness — Implementation Addendum

## Scope and platform constraints

Implement the requested three language tiers as 15 tier placements and 13 unique locale codes. Amharic (`am`) and Afaan Oromoo (`om`) are shared entries across the African and Ethiopian tiers. The unique codes are `en`, `fr`, `es`, `ar`, `zh-CN`, `sw`, `am`, `ha`, `yo`, `om`, `ti`, `so`, and `sid`.

The Webdev managed database capability remains MySQL-compatible; FaidATech's Prisma schema uses PostgreSQL and reads the external `POSTGRES_URL`, not the managed `DATABASE_URL`. The current resource has Development-scoped protected `POSTGRES_URL` and `APP_BASE_URL`; `GET config` reports only `dev` configured and `runtime_sync: applied`, without exposing values. The Supabase Root 2021 CA was verified against the live Session Pooler certificate chain. A read-only PostgreSQL 18 `psql` connection using `sslmode=verify-full` authenticated successfully and confirmed the expected five application tables, four enums, and completed migration `20261108170000_init`; this is the only local migration, and all five application tables contain zero rows. No migration was needed or applied. Prisma's own status command still fails with P1011 (Windows security package: no credentials available; OS error `-2146893042`) after the CA path is found, so Prisma-engine TLS remains blocked on this Windows environment. No Production secret was supplied to this resource; auto-publish remains off and no publication has occurred.

## Localization architecture

- Add a stable locale registry with BCP-47-style codes, native labels, tier memberships, and right-to-left direction for Arabic. Render a tier-grouped responsive locale selector in dashboard chrome and public visitor views.
- Add a root locale provider that persists explicit user selection and falls back to browser language or English. Use typed JSON catalogs keyed by stable message IDs, preserve interpolation placeholders, and retain English as the safe fallback for missing keys.
- Localize the shared dashboard navigation, headings, wizard forms and validation messages, management and analytics screens, public visitor controls, and public resolver errors through the common message catalog.
- Use locale-keyed JSON for future agent-authored dynamic content. Add optional localized content to validated QR payloads with base-field fallback. Expand tourism audio/transcript keys to the 13 unique locale codes while accepting the existing four legacy names so saved QR payloads remain readable.
- Do not machine-translate customer-authored content at render time or execute translated HTML. Keep content as validated text and select only an explicitly saved locale variant; fall back to the existing base payload when a translation is absent.
- Translation files produced during this implementation are AI-assisted drafts. Record their provenance and native-review status. The application must not claim or guarantee zero translation errors; professional native-speaker review is required before treating these catalogs as certified production copy.
- The original structured GPT-6 Luna batch stopped after a fatal insufficient-credits response, initially leaving `am`, `yo`, `om`, `ti`, `so`, and `sid` as English fallbacks. The user subsequently authorized completion. A structured Manus agent workflow has now produced the six full catalogs; each has 458 keys and preserves all source interpolation tokens, and metadata records the workflow source. The six are marked `machine_draft` with `nativeReviewRequired: true`. Together with the original six, all 12 non-English catalogs are machine drafts; none has native-reviewed or certified-error-free status.

## Project structure and validation approach

Use `src/i18n/` for the locale registry, provider, selector, typed translation helpers, and one JSON message catalog per unique locale. Keep locale-aware payload types and backward-compatible normalization in `src/lib/qr/payload-schemas.ts`, and render selected localized fields through existing wizard and visitor components. Add documentation for locale codes, tier duplication, JSON shapes, fallback behavior, and review status. Validate catalog key coverage and interpolation placeholders, old and new tourism payload compatibility, RTL behavior, and API error-code fallback. Run TypeScript diagnostics, Prisma validation, and a production build. The current Development database has been independently verified read-only with PostgreSQL `verify-full` TLS and the supplied Supabase CA; the sole local migration is already applied, all expected tables/enums exist, and the five application tables are empty, so do not apply a migration. Prisma's own query engine still returns Windows P1011 during TLS setup. The latest pinned Corepack typecheck and canonical `prisma/schema.prisma` validation pass; a production build passed earlier. Do not seed user/demo records. Use the Development Preview origin only for Development, preserve the existing all-environments fallback for other environments, and do not expose, print, or commit environment values.


# Public Anonymous Demo and Deployment — Approved Addendum (2026-11-12)

## Scope and security boundary

- Add a dedicated public `/demo` route as an isolated, read-only FaidATech workspace using synthetic examples only. The demo must not fetch from application APIs, instantiate Prisma, query PostgreSQL, create records, or reuse real tenant information.
- Preserve OAuth authentication, organization membership checks, and tenant scoping unchanged on all real `/dashboard` pages and application APIs. Do not add any auth bypass or demo-session cookie to the existing dashboard shell.
- Keep the public demo accessible without sign-in and clearly mark its records and metrics as synthetic sample data. Use the existing locale provider and selector; do not claim missing machine drafts are reviewed translations.
- Add a minimal unauthenticated `/api/health` response for deployment readiness; it must not access or report private runtime/database state.

## Production container contract

- Configure Next.js standalone output and commit a reproducible Dockerfile using the committed `pnpm-lock.yaml` and pinned `pnpm@11.25.0`. Build the production app in the image without requiring private credentials or database access at image-build time; start the server on `0.0.0.0` using the platform `PORT` value (default 3000).
- Declare the Webdev `deploy` domain for the root Dockerfile and unauthenticated `/api/health` path after verifying the current config. Preserve `features.server`, existing secret scopes, the Development-only `APP_BASE_URL` override, the all-environments fallback, and `publishing.auto_publish:false`.
- After the deliverable is pushed to canonical `main`, use the user's explicit publication request. The first Agent publication is private; the user must select Public in the platform's visibility card before a public URL can be reported. Do not use a chat or config write to bypass that card. Publication success and URL must come from the publish result.

## Project structure

Add `src/app/demo/page.tsx` and a small client presentation component under `src/components/demo/` for localized static demo UI; add `src/app/api/health/route.ts`; update `next.config.ts` and `public/manus-routes.json`; and add a root `Dockerfile`. The existing dashboard/auth and API modules remain untouched by this demo feature.
