# PDFMantra production-assurance runbook

This runbook is for administrators. It must not contain customer documents,
passwords, OTPs, service-role keys, webhook URLs, or authentication cookies.

## Required production configuration

- Apply every migration through `0008_production_assurance.sql`.
- Set a strong `CRON_SECRET` in Vercel so the daily health check can run.
- Keep `WORKSPACE_STORAGE_CAPACITY_BYTES` equal to the purchased Supabase
  storage capacity. The application blocks new reservations at the configured
  critical ratio so the project retains operational headroom.
- Optionally set `OPERATIONS_ALERT_WEBHOOK_URL` to an HTTPS-only internal alert
  destination. Alert payloads contain technical counts only.
- Keep the private `pdf-documents` bucket without general browser write
  policies. Upload and download access must remain signed and short-lived.

## Daily checks

1. Open **Administration → Operations** and review Production assurance.
2. Investigate every critical alert immediately.
3. Review stale uploads, failed uploads, failed processing jobs, OTP locks and
   sanitized client errors.
4. Upgrade Supabase storage before the warning threshold becomes critical.
5. Never increase `WORKSPACE_STORAGE_CAPACITY_BYTES` before the infrastructure
   plan has actually been expanded.

## Authenticated workspace acceptance

Run after schema, authentication, storage, or workspace API changes:

```powershell
npm.cmd run test:production:workspace
```

The script creates an email-confirmed temporary test user, obtains a real SSR
session, uploads an original PDF and a second version through signed storage,
restores the original, verifies a signed download checksum, deletes its test
document, and finally removes the temporary user. It never uses customer data.

Required local environment variables are the same Supabase public/service-role
values used by production. `PDFMANTRA_ACCEPTANCE_BASE_URL` may override the
canonical production URL for a preview deployment. Never commit these values.

## Backup policy

- Verify the Supabase database backup schedule and retention in the project
  dashboard every month. Point-in-time recovery availability is plan-dependent.
- Database backups do not replace a storage-object backup. The private PDF
  storage objects and their database metadata must be protected as one recovery
  set with matching timestamps.
- Maintain a separate encrypted export or provider-supported copy of storage
  objects according to the organization's data-retention policy.
- Keep service credentials in the deployment secret store, not inside a backup
  archive or repository.
- Record the backup timestamp, database recovery point, storage snapshot/copy
  timestamp, object count and aggregate bytes in the operations log.

## Restore drill

Perform a restore drill at least quarterly and after a storage-provider change:

1. Restore the database backup into an isolated non-production project.
2. Restore/copy the matching storage objects into a private test bucket.
3. Use a dedicated test account; never send restored email or OTP traffic.
4. Verify document ownership, version ordering, latest-version pointers,
   checksums, signed downloads and restore actions.
5. Run the workspace acceptance test against the isolated deployment.
6. Confirm that cross-account reads/writes fail and no bucket is public.
7. Destroy the isolated recovery environment after the drill under the approved
   retention process.
8. Record recovery time, recovery point, discrepancies and remediation owners.

## Incident response

- **Storage warning:** schedule capacity expansion and inspect growth by account.
- **Storage critical:** the circuit-breaker protects headroom; expand capacity
  before changing the configured ceiling.
- **Stale upload:** inspect the workspace event and object path; do not delete a
  customer object until ownership and finalization state are verified.
- **Failed processing:** disable the affected server capability if outputs may be
  invalid; browser-local tools should remain available.
- **OTP lock spike:** inspect rate-limiting telemetry and request sources without
  exposing email addresses or key hashes.
- **Schema alert:** stop workspace rollout and verify the latest migration and
  service-role grants.

## Recovery acceptance criteria

- Private buckets remain private and have no direct browser write policy.
- Every ready version has a matching object and checksum where recorded.
- Every latest-version pointer references an owned ready version.
- Signed upload/download URLs expire as designed.
- Workspace and operational audit records are queryable by administrators.
- `npm.cmd run test:smoke`, TypeScript, lint and production build all pass.
