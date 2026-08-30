import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  assertWorkspaceCapacity,
  createWorkspaceStoragePath,
  formatBytes,
  getWorkspaceQuota,
  normalizeSha256,
  sanitizePdfFileName,
  sanitizeWorkspaceTitle,
} from "../src/lib/workspace.ts";

const free = getWorkspaceQuota("free");
const plus = getWorkspaceQuota("plus");
const pro = getWorkspaceQuota("pro");
assert.equal(free.maximumDocuments, 10);
assert.equal(free.maximumVersions, 25);
assert.equal(free.maximumFileBytes, 100 * 1024 * 1024);
assert.equal(free.maximumStorageBytes, 250 * 1024 ** 2);
assert.equal(plus.maximumStorageBytes, 500 * 1024 ** 2);
assert.equal(pro.maximumStorageBytes, 1024 ** 3);
assert.equal(pro.maximumFileBytes, 1024 ** 3);
assert.equal(getWorkspaceQuota("unexpected").tier, "free");

const ownerId = "11111111-1111-4111-8111-111111111111";
const documentId = "22222222-2222-4222-8222-222222222222";
const versionId = "33333333-3333-4333-8333-333333333333";
assert.equal(
  createWorkspaceStoragePath({ ownerId, documentId, versionId }),
  `${ownerId}/${documentId}/${versionId}.pdf`,
);
assert.throws(() => createWorkspaceStoragePath({ ownerId: "../other", documentId, versionId }));
assert.equal(sanitizeWorkspaceTitle("  Quarterly\n  report  "), "Quarterly report");
assert.equal(sanitizePdfFileName("../../Finance<>.PDF"), "Finance--.PDF");
assert.equal(normalizeSha256("A".repeat(64)), "a".repeat(64));
assert.equal(normalizeSha256("not-a-checksum"), null);
assert.equal(formatBytes(5 * 1024 ** 2), "5.0 MB");

assert.match(
  assertWorkspaceCapacity({
    quota: free,
    usage: { documentCount: 10, versionCount: 10, storageBytes: 0 },
    fileSizeBytes: 1024,
    createsDocument: true,
  }),
  /document limit/i,
);
assert.match(
  assertWorkspaceCapacity({
    quota: free,
    usage: { documentCount: 1, versionCount: 25, storageBytes: 0 },
    fileSizeBytes: 1024,
    createsDocument: false,
  }),
  /version limit/i,
);
assert.equal(
  assertWorkspaceCapacity({
    quota: free,
    usage: { documentCount: 1, versionCount: 1, storageBytes: 1024 },
    fileSizeBytes: 1024,
    createsDocument: false,
  }),
  null,
);

const sources = await Promise.all(
  [
    "../supabase/migrations/0007_document_workspace_versions.sql",
    "../src/app/api/workspace/documents/route.ts",
    "../src/app/api/workspace/documents/[documentId]/route.ts",
    "../src/app/api/workspace/documents/[documentId]/versions/route.ts",
    "../src/app/api/workspace/documents/[documentId]/versions/[versionId]/route.ts",
    "../src/app/api/workspace/versions/[versionId]/download/route.ts",
    "../src/lib/workspace/client.ts",
    "../src/components/workspace/DocumentWorkspaceClient.tsx",
    "../src/app/dashboard/page.tsx",
    "../src/app/api/admin/overview/route.ts",
  ].map((path) => readFile(new URL(path, import.meta.url), "utf8")),
);

const [
  migration,
  documentsRoute,
  documentRoute,
  versionsRoute,
  versionRoute,
  downloadRoute,
  client,
  dashboardClient,
  dashboardPage,
  adminOverview,
] = sources;

assert.match(migration, /alter table public\.workspace_events enable row level security/i);
assert.match(migration, /workspace_events_select_own/);
assert.match(migration, /document_versions_enforce_owner/);
assert.match(migration, /document_versions_document_number_unique_idx/);
assert.match(migration, /finalize_workspace_version/);
assert.match(migration, /restore_workspace_version/);
assert.match(migration, /grant execute on function public\.finalize_workspace_version[\s\S]*to service_role/);
assert.match(migration, /drop policy if exists "documents_insert_own"/);
assert.match(migration, /drop policy if exists "document_versions_update_own"/);
assert.match(migration, /drop policy if exists "documents_objects_insert_own"/);
assert.doesNotMatch(migration, /create policy "documents_bucket_insert_own"/);
assert.match(migration, /public = false/);
assert.match(migration, /allowed_mime_types/);

for (const source of [documentsRoute, documentRoute, versionsRoute, versionRoute]) {
  assert.match(source, /isSameSiteStateChangingRequest|isSameOriginRequest/);
  assert.match(source, /getWorkspaceRequestContext/);
  assert.match(source, /user\.id/);
}
assert.match(documentsRoute, /createSignedUploadUrl/);
assert.match(versionsRoute, /createSignedUploadUrl/);
assert.match(client, /uploadToSignedUrl/);
assert.match(versionRoute, /storageObjectExists/);
assert.match(versionRoute, /admin\.rpc\("finalize_workspace_version"/);
assert.match(versionRoute, /admin\.rpc\("restore_workspace_version"/);
assert.match(versionRoute, /Only a completed version can be restored/);
assert.match(versionRoute, /Restore another version before deleting the current one/);
assert.match(downloadRoute, /createSignedUrl/);
assert.match(downloadRoute, /expiresInSeconds: 60/);
assert.doesNotMatch(downloadRoute, /SUPABASE_SECRET_KEY/);

assert.match(dashboardPage, /DocumentWorkspaceClient/);
assert.match(dashboardClient, /Upload PDF/);
assert.match(dashboardClient, /Add version/);
assert.match(dashboardClient, /Restore/);
assert.match(dashboardClient, /Download/);
assert.match(dashboardClient, /Private storage/);
assert.match(dashboardClient, /Permanently delete/);
assert.match(adminOverview, /workspace_events/);
assert.match(adminOverview, /storageBytes/);

console.log(
  JSON.stringify({
    workspaceQuotas: "passed",
    ownerIsolatedPaths: "passed",
    signedUploads: "passed",
    signedDownloads: "passed",
    durableVersions: "passed",
    restoreAndCleanup: "passed",
    adminVisibility: "passed",
  }),
);
