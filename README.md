# PDFMantra

PDFMantra is a production Next.js PDF workspace. Browser-capable tools keep
document bytes on the user's device; provider-dependent tools stay fail-closed
until their server capabilities are configured.

## Features included

- Visual PDF editor, page organization, conversion, OCR, signing and export
- AES-256 Protect PDF and authorized password removal through qpdf WASM
- Permanent raster redaction with explicit flattening/signature warnings
- Crop, full form/annotation flattening, structural repair and metadata editing
- Bates numbering and advanced split by size, bookmark or page text
- Batch processing and ordered local workflow chaining
- Page-by-page PDF comparison with visual diffs and text-change reports
- Version-aware PDF comparison with inserted/removed page alignment, line-level review, and JSON/CSV audit reports
- Interactive AcroForm creation for text, checkbox, dropdown and radio fields
- Standards-honest PDF/A preflight and archival preparation without false certification
- OCR scan profiles, deskewing, document binarization and confidence diagnostics
- Canonical public launch readiness across homepage, menus, search and sitemap
- Supabase-backed authentication, entitlements, admin controls and audit history
- Privacy-safe client error telemetry and Core Web Vitals administration
- Deterministic launch, security, editor, conversion, Stage 1 and Stage 2 regression suites

## Stage 2 professional workflows

`/tools/compare`, `/tools/form-creator`, and `/tools/pdfa` run locally in the
browser and are registered through the same fail-closed public launch policy as
the rest of PDFMantra. Advanced outputs use the existing entitlement and audit
path. PDF/A preparation intentionally does not add a conformance declaration;
regulated archival use still requires validation with a standards-grade
validator such as veraPDF.

The Compare PDFs workflow first aligns page text before rendering visual
differences. An inserted or removed page therefore does not incorrectly mark
every later page as changed. Its audit exports include original/revised page
mapping and line-level change samples; image-only pages still rely primarily on
the visual comparison signal.

## How to run

```bash
npm install
npm run dev
```

Production verification:

```bash
npx tsc --noEmit
npm run lint
npm run audit:launch
npm run test:smoke
npm run build
npm audit --omit=dev
```

## Database migrations

Apply the SQL files in `supabase/migrations` in numeric order. Migration
`0006_client_telemetry.sql` creates a service-role-only reliability table used
by `/api/telemetry` and the administrator Operations screen. If that migration
has not yet been applied, telemetry safely falls back to structured server logs
and the admin screen reports that the migration is required.

Migration `0007_document_workspace_versions.sql` activates the authenticated
document workspace, private version storage, restore history, quota enforcement
and workspace audit events. Metadata writes are service-role-only. PDF bytes
are transferred with short-lived signed upload/download URLs and the private
`pdf-documents` bucket intentionally has no general browser object policy.
Apply this migration before exposing `/dashboard` in production.
The current account quotas are deliberately capped at the deployed Supabase
project's 1 GB storage ceiling; raise both infrastructure and application
quotas together when the storage plan is upgraded.

Migration `0008_production_assurance.sql` remediates the Supabase
`active_subscriptions` security-advisor finding with an invoker-rights view,
adds service-role-only operational alerts, and provides aggregate workspace
capacity measurement. The daily `/api/operations/health` check records storage,
upload, processing, authentication and client-reliability threshold breaches.
Configure `CRON_SECRET`, keep `WORKSPACE_STORAGE_CAPACITY_BYTES` aligned with
the purchased Supabase storage plan, and optionally provide an HTTPS
`OPERATIONS_ALERT_WEBHOOK_URL`. See
`docs/operations/production-assurance.md` for backup and restore procedures.

Migration `0009_supabase_advisor_hardening.sql` pins the shared update-trigger
search path and removes public API execution rights from internal trigger
helpers. Apply it immediately after migration `0008` and rerun the Supabase
security advisor.

Migration `0010_profile_update_permissions.sql` restricts customer profile
updates to presentation-only fields. Apply it before enabling the My Account
personal-details form so authenticated customers cannot alter plan, quota, or
entitlement columns through the public API.

Migration `0011_saved_signature_storage_hardening.sql` keeps reusable account
signatures private, limits PNG files to 2 MB, and bounds signature labels.
Apply it before enabling multiple saved signatures in Fill & Sign.

Telemetry is technical only: route paths, sanitized error summaries and Web
Vitals. The API rejects full URLs and sanitizes email-like strings; document
content, filenames, passwords and form values must never be submitted.

## Deploy

Push `main` to GitHub and deploy through the connected Vercel project. Keep
Supabase public and service-role configuration in deployment environment
variables, never in repository files.
