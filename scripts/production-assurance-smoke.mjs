import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  assertGlobalWorkspaceCapacity,
  evaluateOperationalAlerts,
} from "../src/lib/operations.ts";

assert.equal(
  assertGlobalWorkspaceCapacity({
    storageBytes: 70,
    incomingBytes: 10,
    storageCapacityBytes: 100,
    criticalRatio: 0.95,
  }),
  null,
);
assert.match(
  assertGlobalWorkspaceCapacity({
    storageBytes: 90,
    incomingBytes: 10,
    storageCapacityBytes: 100,
    criticalRatio: 0.95,
  }),
  /temporarily at capacity/i,
);

const alerts = evaluateOperationalAlerts(
  {
    schemaConfigured: true,
    storageBytes: 96,
    storageCapacityBytes: 100,
    staleUploads: 1,
    failedUploads24h: 1,
    failedJobs24h: 4,
    lockedOtpScopes: 5,
    clientErrors24h: 20,
  },
  {
    storageWarningRatio: 0.8,
    storageCriticalRatio: 0.95,
    staleUploadMinutes: 30,
    failedUploadWarning: 1,
    failedJobWarning: 3,
    lockedOtpWarning: 5,
    clientErrorWarning: 20,
  },
);
assert.ok(alerts.some((alert) => alert.fingerprint === "workspace-storage-critical"));
assert.ok(alerts.some((alert) => alert.fingerprint === "authentication-otp-locks"));

const [
  migration,
  advisorHardeningMigration,
  operationsRoute,
  operationsServer,
  documentsRoute,
  versionsRoute,
  adminOverview,
  adminPage,
  acceptance,
  runbook,
  vercel,
] = await Promise.all(
  [
    "../supabase/migrations/0008_production_assurance.sql",
    "../supabase/migrations/0009_supabase_advisor_hardening.sql",
    "../src/app/api/operations/health/route.ts",
    "../src/lib/operations/server.ts",
    "../src/app/api/workspace/documents/route.ts",
    "../src/app/api/workspace/documents/[documentId]/versions/route.ts",
    "../src/app/api/admin/overview/route.ts",
    "../src/app/admin/page.tsx",
    "./workspace-production-acceptance.mjs",
    "../docs/operations/production-assurance.md",
    "../vercel.json",
  ].map((path) => readFile(new URL(path, import.meta.url), "utf8")),
);

assert.match(migration, /security_invoker\s*=\s*true/i);
assert.match(migration, /revoke all on table public\.active_subscriptions from public, anon, authenticated/i);
assert.match(migration, /operational_alerts/);
assert.match(migration, /workspace_storage_usage_bytes/);
assert.match(advisorHardeningMigration, /alter function public\.touch_updated_at\(\)\s+set search_path = public/i);
assert.match(advisorHardeningMigration, /revoke all on function public\.handle_new_profile\(\)\s+from public, anon, authenticated/i);
assert.match(advisorHardeningMigration, /revoke all on function public\.enforce_workspace_version_owner\(\)/i);
assert.match(advisorHardeningMigration, /revoke all on function public\.rls_auto_enable\(\)/i);
assert.match(operationsRoute, /CRON_SECRET/);
assert.match(operationsRoute, /runOperationalHealthCheck/);
assert.match(operationsServer, /OPERATIONS_ALERT_WEBHOOK_URL/);
assert.match(documentsRoute, /assertGlobalWorkspaceCapacity/);
assert.match(versionsRoute, /assertGlobalWorkspaceCapacity/);
assert.match(adminOverview, /collectOperationalHealth/);
assert.match(adminPage, /Production assurance/);
assert.match(acceptance, /createUser/);
assert.match(acceptance, /uploadToSignedUrl/);
assert.match(acceptance, /action: "restore"/);
assert.match(acceptance, /downloadChecksum/);
assert.match(runbook, /restore drill/i);
assert.match(runbook, /storage objects/i);
assert.match(vercel, /api\/operations\/health/);

console.log(JSON.stringify({
  securityAdvisorRemediation: "passed",
  aggregateCapacityCircuitBreaker: "passed",
  durableOperationalAlerts: "passed",
  authenticatedAcceptanceHarness: "passed",
  backupRecoveryRunbook: "passed",
}));
