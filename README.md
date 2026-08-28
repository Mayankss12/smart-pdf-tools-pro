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
- Canonical public launch readiness across homepage, menus, search and sitemap
- Supabase-backed authentication, entitlements, admin controls and audit history
- Privacy-safe client error telemetry and Core Web Vitals administration
- Deterministic launch, security, editor, conversion and Stage 1 regression suites

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

Telemetry is technical only: route paths, sanitized error summaries and Web
Vitals. The API rejects full URLs and sanitizes email-like strings; document
content, filenames, passwords and form values must never be submitted.

## Deploy

Push `main` to GitHub and deploy through the connected Vercel project. Keep
Supabase public and service-role configuration in deployment environment
variables, never in repository files.
