# FaidATech — Implementation Outcomes

## 1. Next.js and tenant-aware database foundation — Complete (initial PostgreSQL migration applied)
- Build FaidATech as a multi-tenant dynamic QR SaaS platform using Next.js App Router, TypeScript, Tailwind CSS, Prisma ORM, and PostgreSQL.
- Generate a clean, scalable project structure.
- Configure Tailwind brand tokens: Primary Green `#10B981` (or a custom brand hex), Navy Blue `#0F172A`, Teal `#14B8A6`, and Slate Grey `#64748B`.
- Define PostgreSQL Prisma models for `Organization`, `User`, `QRCode`, `Campaign`, and `ScanAnalytics`, with appropriate relations, identifiers, timestamps, and tenant ownership.
- Establish tenant boundaries by associating users, QR codes, campaigns, and analytics records with organizations.
- Include Prisma client setup, environment configuration templates, and initial database migration readiness.
- Configure base API authentication middleware and tenant-context protection for secured application and API routes.

## 2. Dynamic QR generation, payload handlers, and resolution — Complete (live PostgreSQL connection verified)
- Build the core QR generation and resolution services for FaidATech on the initialized schema and Next.js foundation.
- Implement modular payload resolvers for vCard contact details, social links, and digital business-card fields; digital menu categories, item lists, ETB pricing, and Telebirr checkout metadata; Tourism & Heritage Guide multilingual audio links in Amharic, Afaan Oromoo, English, and Tigrigna, GPS coordinates, and historical media content; and Document/PDF file URLs and hosted-asset metadata.
- Tourism `audioLinks` and `transcripts` also support all 13 unique locale codes; the legacy keys `amharic`, `afaanOromoo`, `english`, and `tigrigna` remain accepted and normalize to `am`, `om`, `en`, and `ti`.
- Model dynamic QR codes with a unique `shortCode` and configurable destination type for landing pages, vCards, menus, tourism audio, and PDFs.
- Generate a scannable QR image encoding each public `/r/[shortCode]` URL.
- Implement both the `/r/[shortCode]` dynamic route and `/api/r/[shortCode]` resolution endpoint.
- Query the database for the requested `shortCode`, verify `isActive` and expiration rules, and return structured JSON for dynamic client rendering or a 302 redirect for direct URL destinations.
- Capture scan metadata asynchronously in `ScanAnalytics`, including device OS, User-Agent, IP/location approximation, and organization, QR code, and campaign associations where applicable.

## 3. Secure multi-tenant QR CRUD APIs — Complete (schema and live connection verified; no tenant data seeded)
- Create secured multi-tenant API routes under `/api/qrcodes` to Create, Read, Update, and Delete (soft-delete) dynamic QR records.
- Scope every QR operation strictly to the authenticated user's `Organization` and enforce tenant boundaries on related campaign references.
- Include runtime validation (using Zod or equivalent) for all endpoint inputs, and strict tenant boundary enforcement.
- List records with validated offset pagination and server-side search; provide tenant-wide QR/active/scan totals and top-scan summaries independent of the current page.

## 4. Authenticated dashboard shell — Complete in code (Development Preview origin is configured; login flow not yet exercised)
- Ensure strict adherence to Primary Green `#10B981`, Navy Blue `#0F172A`, Teal `#14B8A6`, and Slate Grey `#64748B`.
- Implement the standard enterprise dashboard sidebar layout with navigation links for Dashboard, My QR Codes, Analytics, Campaigns, Integrations, and Settings.
- Keep dashboard routes authenticated and connect the frontend to the existing secured FaidATech APIs.

## 5. Universal QR creation wizard — Complete (database and Development Preview origin configured; no live save submitted during QA)
- Build the universal QR creation wizard at `/dashboard/create`.
- Build the generic scope/purpose selection grid: Digital vCard, Restaurant Menu, Tourism & Heritage Guide, Document/PDF, and Local Payments.
- Build multi-step interactive form editors. vCard form: personal details, phone, email, organization, title, and social links. Digital Menu form: item name, category, price in ETB, and description. Tourism Audio form: multilingual audio link inputs in Amharic, Afaan Oromoo, English, and Tigrigna; GPS coordinates; and a transcript text editor.
- Include a real-time mobile preview box on the right side of the wizard reflecting dynamic form input updates.

## 6. QR management dashboard — Complete (live database initialized; currently no records)
- Build `/dashboard/qrcodes` as an interactive table displaying existing tenant QR codes with status badges (Active, Paused, Expired), scan counts, and shortcode previews.
- Provide SVG/PNG download buttons, edit actions, and soft-delete actions connected to `/api/qrcodes`.
- Allow users to reach every matching tenant QR record through pagination and server-side search; do not silently cap the table at the first 100 records.

## 7. Public visitor resolution experience — Complete (live PostgreSQL resolver verified)
- Build a clean, responsive visitor mobile view at `/r/[shortCode]` for dynamic JSON payloads.
- Include a modern audio-player layout for Tourism audio guides, dynamic vCard contact downloading, and an interactive digital menu listing.

## 8. Shared navigation, breadcrumbs, and deterministic back controls — Complete
- Add explicit breadcrumbs, such as `Home > Dashboard > Create Dynamic QR`, on `/dashboard`, `/dashboard/qrcodes`, `/dashboard/analytics`, `/dashboard/campaigns`, `/dashboard/integrations`, `/dashboard/settings`, and `/dashboard/create`.
- Add a prominent `← Back` control on dashboard sub-pages and the creation wizard. Back controls must use a deterministic in-app destination when browser history is empty so users do not get stuck when screens resize.
- Make the sidebar navigation include an accessible, responsive mobile hamburger toggle and usable small-screen drawer behavior.

## 9. Reference-aligned dashboard visual system — Complete (all 18 panels in the supplied six-page document reviewed)
- Review and apply the visual direction in all 18 reference panels in the attached `Document1.docx` to `/dashboard`, `/dashboard/qrcodes`, `/dashboard/analytics`, `/dashboard/campaigns`, `/dashboard/integrations`, `/dashboard/settings`, and the creation wizard.
- Align card elevations, padding, typography, page hierarchy, responsive layout, and brand colors: Primary Green `#10B981`, Navy Blue `#0F172A`, Teal `#14B8A6`, and Slate Grey `#64748B`.
- Keep interactions and existing tenant-scoped data behavior functional; do not present reference-only mock metrics or unsupported operations as live features.

## 10. Per-QR identity, logo upload, and contrast-safe customization — Complete in code (authenticated live upload requires a valid tenant session)
- Allow the QR creator to enter custom identity details including name, an organization logo upload, and custom brand colors without hardcoding institutional names.
- Implement the authenticated logo upload endpoint at `/api/assets`, enforce tenant authorization, validate supported image type and file size, and store the logo at a stable durable project-storage address without exposing platform credentials or retaining temporary browser blob URLs.
- Provide a usable hosted-logo URL fallback if project storage is unavailable.
- Persist each QR's custom identity with that QR destination and validate the supported fields at runtime.
- Enforce adequate contrast for customized QR foreground colors against the light background so generated codes remain scan-friendly.

## 11. Live QR generator preview and styled exports — Complete in code (database and Development Preview origin configured; no live save submitted during QA)
- Connect Organization Logo Upload, Brand Accent Picker, title/description, contact information, menu items, and multilingual audio links directly to the right-side Live Mobile Preview so it reflects input changes in real time.
- Generate functional scan-ready dynamic QR codes through the existing tenant-scoped database endpoints; the encoded public short URL must keep resolving dynamically.
- Connect the saved per-QR brand customization to working SVG and PNG export/downloads.

## 12. Visitor-side brand continuity — Complete in code (database-ready)
- Carry each saved QR's custom organization identity, logo, and brand accent through to its public dynamic visitor experience.
- Retain the responsive, destination-specific visitor behavior for vCards, menus, tourism audio guides, and landing pages, with readable text contrast and existing direct URL/PDF redirect behavior.

## 13. Interactive QR wizard workflow repair — Complete in code (Preview behavior verified; DB migration now applied)
- **Step Transition Fix:** When a user selects any purpose card (e.g., Digital vCard, Restaurant Menu, Tourism & Heritage Guide, etc.) and clicks `Continue →`, it MUST successfully transition to Step 2 (Details), rendering the correct dynamic input fields corresponding to the chosen purpose (such as vCard inputs, menu categories, or 4-language audio fields).
- **Live Preview Synchronization:** Ensure that whatever is typed in Step 2 updates the right-side Live Mobile Preview in real time.
- **Step 3 (Review & Generate):** Ensure users can proceed to Step 3 to review, test, and generate the final styled SVG/PNG QR code connected to the backend database endpoints.
- **18-Design Standards Alignment:** Verify that all sub-pages adhere strictly to the 18 reference panels provided, ensuring zero broken interactions or stuck UI states.
- **Evidence:** Verified each of the six purpose cards transitions to its matching Step 2 editor; live title/contact/menu/audio preview updates; vCard reaches Review with the generate action visible; and the mobile wizard has no horizontal overflow. No database record was submitted during QA.

## 14. PostgreSQL runtime configuration — Partially complete (Development database verified independently; Prisma TLS in this Windows environment remains blocked; publication remains off)
- Configure or verify the environment variables (`POSTGRES_URL` and `APP_BASE_URL`) so that the Prisma schema and database operations can execute successfully without returning connection warnings.
- Verify the external Supabase Session Pooler URL using read-only Prisma access and enforce TLS for Prisma application and migration connections.
- Apply the reviewed initial migration only after confirming the target schema contains no conflicting FaidATech tables, enums, or migration history.
- **Historical evidence (Nov 10–12):** Read-only TLS-required Prisma connection succeeded; the target public schema was empty; initial migration `20261108170000_init` applied; the five expected tables exist; all five application tables contain zero rows; `pnpm db:status` reported the schema up to date; the public QR resolver returned 404 for an unknown code instead of a database-configuration warning.
- The archived all-environments and Development secret-scope note is historical. The current FaidATech managed resource has Development-scoped `POSTGRES_URL` and `APP_BASE_URL`; `GET config` confirms both are configured in `dev` and `runtime_sync` is applied, without exposing values. No Production values were supplied to this resource.
- **Current request (2026-11-14):** Development secrets are configured and synchronized. The public Supabase Root 2021 CA was verified against the Session Pooler chain, and strict TLS succeeded with the CA. A read-only PostgreSQL 18 `psql` session using `sslmode=verify-full` authenticated to the current Development database and found the five expected application tables, four enums, and the applied migration `20261108170000_init`, which is the only local migration; all five application tables contain zero rows. No migration write was needed or issued. Prisma's own read-only status still fails with P1011 (`No credentials are available in the security package`, OS error `-2146893042`) after finding the CA file, so Prisma-engine TLS remains blocked on Windows. The Next.js service is resident on loopback port 3000; `/` returns HTTP 200 and `/manus-routes.json` returns valid JSON with 11 routes. Catalog validation passes; the latest pinned Corepack `pnpm typecheck` and `pnpm exec prisma validate --schema prisma/schema.prisma` both pass.


## 15. Production-grade multilingual engine — Pending (catalog translations require native-speaker review)

- Support the following 15 core language placements in three strict tiers: Global Tier — English, French, Spanish, Arabic, Mandarin Chinese; African Tier — Swahili, Amharic, Hausa, Yoruba, Oromo (Afaan Oromoo); Ethiopian Tier — Amharic, Afaan Oromoo, Tigrigna, Somali, Sidama. Amharic and Afaan Oromoo appear in two tiers and are represented by one locale each.
- Extend multilingual Tourism audio links and transcripts to the 13 unique locale codes while retaining the existing four legacy property names for saved QR records.
- Provide a seamless, responsive Dynamic Language Selector on all public visitor views (`/r/[shortCode]`) and dashboard interfaces, allowing users and visitors to instantly toggle among these languages.
- Ensure UI labels, error messages, and dynamic content templates use native, culturally accurate phrasing to eliminate grammatical or contextual errors. The requested quality target is zero translation errors; any implementation limit or required review must remain explicit rather than being represented as a guarantee.
- Structure backend localization storage as clean JSON/i18n keys so a future dedicated custom AI Agent can dynamically read, generate, and update multilingual content effortlessly.
- **Implementation evidence:** The locale registry/provider, persistent tiered selector, Arabic RTL, English key fallback, dashboard/public error mapping, visitor overrides, locale-aware QR labels, and 13-code tourism audio/transcript fields are integrated. The selector explicitly labels machine drafts and English fallbacks. `node scripts/validate-i18n.mjs` passes for 13 catalogs and 458 keys; the latest pinned Corepack TypeScript check passes and the production build passed earlier. The current route manifest returns HTTP 200 JSON and lists 11 page routes. No database test records were written.
- **Translation status:** The initial GPT-6 Luna batch generated machine drafts for French, Spanish, Arabic, Simplified Chinese, Swahili, and Hausa but left six English fallbacks. A subsequent structured Manus agent workflow generated full drafts for Amharic, Yoruba, Afaan Oromoo, Tigrigna, Somali, and Sidama. No non-English catalog is native-reviewed or certified error-free.
- **Current follow-on request (2026-11-14) — Complete:** Catalogs `am`, `yo`, `om`, `ti`, `so`, and `sid` each contain 458 messages with source key and interpolation-placeholder parity. Metadata records Manus workflow provenance, `translationStatus` and `reviewStatus` are `machine_draft`, and `nativeReviewRequired` is true. `node scripts/validate-i18n.mjs` passes for all 13 catalogs, 458 keys, 12 machine drafts, zero English fallbacks, and zero native-reviewed catalogs. Native-speaker review remains pending.


## 16. Isolated anonymous public demo and deployment — Approved, Pending
- Add a read-only public `/demo` page using synthetic data only, with no database access.
- Keep the real dashboard and APIs behind OAuth and tenant checks; do not add an authentication bypass to real routes or access real tenant records from the demo.
- Prepare and publish the public deployment only after committing the Dockerfile/runtime health contract and all route declarations. The first publication is private; the user chooses Public visibility in the platform's Publish card. Only provide the deployed URL after confirmed publication succeeds.
- Keep auto-publish off and do not place database credentials or other private values in the image or browser bundle.


## 16. Supabase Auth migration and FaidATech logo — In progress
- Remove the external Manus OAuth requirement from the login and authentication flow and replace it with Supabase Auth using Email/Password and Google Sign-In.
- Ensure successful sign-in redirects to the dashboard and that protected dashboard/API requests resolve the Supabase identity to its FaidATech organization membership without unauthorized errors.
- Use the existing `public/logo.png` directly in the login and dashboard brand headers, with responsive sizing and accessible alt text.
- Keep this change focused on authentication and the two brand headers; do not apply database migrations or seed customer records.


## 17. Supabase Auth migration and FaidATech logo — In progress
- Replace Manus OAuth/session validation with Supabase Auth Email/Password and Google Sign-In; map verified Supabase user IDs to tenant membership.
- Redirect signed-in users to `/dashboard`; distinguish authentication failures from database/session availability errors.
- Use `public/logo.png` in login and dashboard headers with responsive sizing.
- Keep scope limited to authentication and these two brand headers; do not migrate or seed the database.


# Phase 2 — QR Ecosystem Expansion & Field Agent System

## 18. Additive relational + JSONB ecosystem model — In progress
- Preserve the existing Phase 1 `Plan`, `Subscription`, `PlanQuota`, `BillingCheckout`, and `BillingEvent` models, payment state handling, QR quota enforcement, `/dashboard/billing`, rate-limit/pooler resilience, and all existing QR/vCard/Menu/Tourism flows. Do not rewrite existing billing routes or quota contracts.
- Add typed relational fields for tenant ownership, query/filter/sort/status/sector/agent fields and JSONB (`profileData`, `customFields`, or domain metadata) for extensions. Include GIN `jsonb_path_ops` guidance for containment queries, expression B-tree examples, and partial indexes. Add only a forward-only migration; do not apply it to a live database.

## 19. Twenty-eight vertical templates, extension engine, approvals, and bulk operations — In progress
- Support individual and organization/government/group profiles plus custom field/block extensions for: (1) construction & civil engineering (ECA licence, COC 1–5, GC/BC grades, project gallery, machinery/fleet, tenders/quotes); (2) architecture & interior design (before/after portfolio, packages, 3D/media, consultation booking, material catalog/360/PDF); (3) electrical/plumbing/construction technicians (COC/skills, service area, emergency call, tariff, quote/order); (4) healthcare & medicine (specialization, licence, facility/schedule, lab/services, appointment, insurance/privacy); (5) pharmacy & medical supplies (pharmacist/facility licence, branches, medicine inquiry, prescription/delivery); (6) legal & business advisory (advocate tier, practice, partners/packages, confidential intake/protected access); (7) accounting/audit/tax advisory (credentials, services, calendar/reminders, downloadable forms); (8) real estate/property sales/rentals (agent vCard, listings/photos/prices, developer projects/payment plan, sitemap, viewing); (9) IT/software (developer/company, GitHub/portfolio, SaaS/cloud/ERP, SLA/API docs, leads); (10) creative/photography/video/graphics (portfolio/showreel, packages, links, equipment/team, catalog/booking); (11) education/training/coaching (credentials/courses, programmes, enrollment/fees, syllabus/registration); (12) agriculture/coffee/crops/trade (farmer/co-op/exporter, crop/quality, collection/warehouse, geolocation/EUDR metadata); (13) veterinary/livestock (licence/field area, animal care, vaccination schedule, bulk/emergency support); (14) manufacturing/industry (factory capacity, quality certification, B2B catalog, sample/visit); (15) retail/wholesale/e-commerce (merchant/store, branches/catalog/pricing, payment links); (16) transport/logistics/driving (licence/vehicle class, routes/fleet, freight quote, tracking, warehouse/customs); (17) auto repair/garage (specialties, services/parts/estimate, maintenance log, towing); (18) beauty/fashion/tailoring (lookbook, pricing/packages, booking, measurement/order); (19) food/catering/chefs (menu, event packages, tasting/order, dietary/allergen); (20) tourism/guides/travel (licensed guide/operator, routes/itinerary, multilingual guide, booking); (21) sports/fitness/wellness (credentials, memberships/classes/results/registration); (22) creators/digital marketing (media kit, link hub, campaigns/SEO/media packages, sponsorship); (23) government/municipalities (official details/hours, checklists, complaints, Mesob/eServices/Fayda links); (24) justice/police/emergency (official ID/station, emergency contacts, incident/geolocation report, guidance); (25) religious/charity/NGO (leader ID, mission/projects/reports, donation/volunteer intake, receipt/reference); (26) associations/co-ops/Iddirs (member ID, bylaws/benefits/minutes/dues, contribution/voting); (27) teams/workgroups (member role, directory/portfolio, bulk spreadsheet creation, HR/admin approval); (28) journalism/media/PR (press verification, articles/editorial, ad rates/releases, tip/statement intake).
- Validate custom fields/blocks, provide bulk CSV/spreadsheet import support, use approval transitions `draft` / `pending_approval` / `approved` / `rejected`, and enforce scoped editing permissions.

## 20. Shared services and low-bandwidth/offline resilience — In progress
- Add one-to-many public shared service support for Tourism/Heritage multilingual audio guides; hotel/restaurant/menu/Wi-Fi/wayfinding; government/Mesob guides; public transport; events/holidays/stadiums; education/libraries/public health. Keep public payloads lightweight, lazy-load media/audio, support SVG export with a four-module quiet zone and scan CTA, and add offline/cache support for intermittent networks. Publish cache headers only for approved public content.

## 21. Ecosystem pillars 3–6 foundations — In progress
- Pillar 3: product traceability, serialization/batches, GS1 Digital Link, EUDR origin metadata, scan anomaly flags.
- Pillar 4: document/credential verification and Fayda/Mesob hooks without insecure storage of raw sensitive IDs.
- Pillar 5: attach interoperable payment links/checkouts alongside Telebirr, Chapa, Stripe, and bank flows without changing Phase 1 billing.
- Pillar 6: CMMS asset tags, maintenance history, manuals/parts, fault reporting, and audit log.

## 22. Field agent system and permission boundary — In progress
- Add `agent` role and a scoped agent dashboard/portal, referral/agent code, customer/lead collection and onboarding status, collection counts, commission calculation, and payout status. Add owner/admin agent management and commission controls. Every list/update must be scoped to the active organization, and agents may access only records assigned to their own agent profile.

## 23. Thirteen locales and regression verification — In progress
- Update all 13 locale catalogs while preserving Arabic RTL, Amharic/Tigrinya/Afaan Oromoo typography, Noto Sans Ethiopic and existing contrast/focus defaults. Mark new unreviewed copy for translation/native-speaker review rather than claiming it is certified.
- Run `npx prisma validate --schema prisma/schema.prisma`, `npm exec tsc -- --noEmit`, `npm run lint`, `npm run validate:i18n`, and `npm run build`. Do not reset, seed, or migrate the live database.


## Phase 2 handoff status (2026-11-21)

- **Implemented in local code:** additive Prisma models and forward-only migration file; 28-sector template registry; bounded CSV profile import; profile draft/edit/submit/approve/reject workflows; profile creator/admin scoping; field agent, leads, commission/payout status foundations; ecosystem APIs and dashboards; shared-service visitor pages and QR SVG; role-aware dashboard navigation; and updates to all 13 locale catalogs.
- **Safety:** no migration, reset, seed, production secret change, push, or database write was performed. The Phase 2 migration remains unapplied and requires explicit authorization before deployment. Existing billing, quotas, and Phase 1 routes were not intentionally edited.
- **Final verification (2026-11-21):** Prisma validation (with a disposable placeholder `POSTGRES_URL`), TypeScript, i18n validation (13 locales / 517 keys), production build, and `git diff --check` all passed after the final edits. Lint exited successfully with 28 warnings and 0 errors. `npm ci` reported five high-severity audit findings; dependencies were not changed.
- **Remaining limits:** no XLSX parser; no live credential/payment-provider adapter; scan/anomaly processing is foundation only; browser-level cold-offline shell/static-asset behavior and payout workflow need fixture testing; audit-log coverage should be confirmed across every ecosystem mutation; no non-English locale is native-reviewed.
- **Resume instructions:** read `PHASE2_HANDOFF.md`; review migration and diff; test tenant/agent scopes with disposable fixtures; do not apply migration absent explicit authorization.

## Unified `/dashboard/create` continuation — 2026-11-21

- Preserve the existing QR destinations, live mobile preview, save/edit/export flows, and QR payload contracts while adding the 28 sector profiles as a second path in the same creation experience.
- Use friendly, localized profile fields with individual/organization/government/group kinds, custom details, CSV import, draft/review actions, and tenant-scoped editing. Keep JSONB and database implementation details out of end-user forms.
- Translate visible Phase 2 UI strings in all 13 catalogs; retain Arabic RTL and identify machine-generated translations as requiring native-speaker review.
- Validate Prisma schema, TypeScript, lint, i18n, and production build; package changed project files with a resume note. Do not apply migrations or touch unrelated repositories.


## Four-pillar creation consolidation — In progress (2026-11-21)

- **Pillar 1 — Basic (ቤዚክ):** Keep simple everyday QR choices in the same creation flow, including URL/Link, PDF/File, Digital vCard, and other existing capabilities. Preserve Custom Landing/Web URL, Restaurant Menu with ETB/Telebirr/payment options, Tourism/Heritage Guide, Document/PDF, Local Payments/Custom Destination, easy fill-and-save behavior, live mobile preview, custom QR color styling, logo placement, and working file/document/media upload controls without raw JSON or technical jargon. Keep every existing legacy QR capability accessible.
- **Pillar 2 — Sector Profiles (28 ዘርፎች):** Keep all 28 sector templates available in the unified workflow for individuals, organizations/businesses, government/institutions, and groups/associations. Provide simple fields, custom fields/blocks/extensions, reuse/duplicate-friendly workflows, bulk CSV import, approval, live preview, and scoped editing without presenting a disconnected technical silo.
- **Pillar 3 — Shared Multi-Scan Services:** Make high-concurrency shared scan experiences available from the same creation flow, including menus, tourism/audio guides, hotel/Wi-Fi/wayfinding, public/Mesob service guides, transport, events/holidays, education and health. Keep these lightweight for low-bandwidth/mobile use and offline/cache-friendly; preserve safe public caching, lazy media, and existing shared-service QR/SVG functionality.
- **Pillar 4 — Scan-to-Action & Owner Response:** Let a scan visitor send a bounded request/response through a clearly labeled form and let the QR/service owner review the resulting submission in a clear, private organization-scoped inbox. Public submission must validate a published service, limit abuse, keep submissions out of public cache responses, and avoid exposing one tenant's responses to another.
- **Consolidate dashboard entry points:** Make `/dashboard/create` the one canonical core creation screen with four pillar choices; remove sidebar links that duplicate this workflow, redirect legacy Templates and Shared Services routes into their matching pillar, and do not revive the unused legacy raw-JSON `TemplateWorkspace`. Keep advanced Pillars 3–6 foundations grouped separately where needed to avoid bloating the core flow.
- **Localization, guardrails and handoff:** Localize all new visible labels/actions/statuses/messages across 13 locales (`am`, `ti`, `om`, `ar`, `en` and all others), retain Arabic RTL and machine-draft/native-review metadata, and run Prisma schema validation, TypeScript, lint, i18n validation and production build. Do not reset or seed a database, apply a live migration, change Supabase RLS in bulk, or rotate/overwrite secrets. Package every modified/new project file into a downloadable ZIP and provide a resume note with completed work, exact files, remaining work, and exact next commands.
