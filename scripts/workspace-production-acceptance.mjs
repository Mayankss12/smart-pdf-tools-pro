import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts } from "pdf-lib";

const baseUrl = new URL(
  process.env.PDFMANTRA_ACCEPTANCE_BASE_URL ?? "https://smart-pdf-tools-pro.vercel.app",
);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const publishableKey = (
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)?.trim();
const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();

for (const [name, value] of [
  ["NEXT_PUBLIC_SUPABASE_URL", supabaseUrl],
  ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", publishableKey],
  ["SUPABASE_SECRET_KEY", secretKey],
]) {
  if (!value) throw new Error(`${name} is required for the production workspace acceptance test.`);
}

const admin = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const publicClient = createClient(supabaseUrl, publishableKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const cookieJar = new Map();
const ssrClient = createServerClient(supabaseUrl, publishableKey, {
  cookies: {
    getAll() {
      return [...cookieJar.entries()].map(([name, value]) => ({ name, value }));
    },
    setAll(values) {
      for (const { name, value, options } of values) {
        if (options?.maxAge === 0) cookieJar.delete(name);
        else cookieJar.set(name, value);
      }
    },
  },
});

const password = `${randomBytes(24).toString("base64url")}aA1!`;
const email = `pdfmantra.acceptance.${Date.now()}@example.com`;
let testUserId = null;
let documentId = null;
let originalVersionId = null;
let secondVersionId = null;

function cookieHeader() {
  return [...cookieJar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function createPdf(label) {
  const document = await PDFDocument.create();
  const page = document.addPage([612, 792]);
  const font = await document.embedFont(StandardFonts.Helvetica);
  page.drawText(`PDFMantra production acceptance: ${label}`, {
    x: 72,
    y: 700,
    size: 16,
    font,
  });
  return new Uint8Array(await document.save());
}

function checksum(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function appRequest(path, init = {}) {
  const response = await fetch(new URL(path, baseUrl), {
    ...init,
    redirect: "manual",
    headers: {
      accept: "application/json",
      cookie: cookieHeader(),
      origin: baseUrl.origin,
      referer: new URL("/dashboard", baseUrl).href,
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) {
    throw new Error(`${init.method ?? "GET"} ${path} failed (${response.status}): ${payload?.error ?? "invalid response"}`);
  }
  return payload;
}

async function initializeUpload({ bytes, existingDocumentId, label }) {
  const endpoint = existingDocumentId
    ? `/api/workspace/documents/${existingDocumentId}/versions`
    : "/api/workspace/documents";
  return appRequest(endpoint, {
    method: "POST",
    body: JSON.stringify({
      title: "Production acceptance document",
      originalFileName: "pdfmantra-production-acceptance.pdf",
      mimeType: "application/pdf",
      sizeBytes: bytes.byteLength,
      pageCount: 1,
      checksumSha256: checksum(bytes),
      label,
      kind: existingDocumentId ? "processed" : undefined,
      sourceTool: "production-acceptance",
    }),
  });
}

async function uploadAndFinalize(initialized, bytes) {
  const ticket = initialized.upload;
  const upload = await publicClient.storage
    .from(ticket.bucket)
    .uploadToSignedUrl(ticket.path, ticket.token, bytes, {
      cacheControl: "60",
      contentType: "application/pdf",
    });
  if (upload.error) throw upload.error;
  await appRequest(
    `/api/workspace/documents/${ticket.documentId}/versions/${ticket.versionId}`,
    { method: "PATCH", body: JSON.stringify({ action: "finalize" }) },
  );
  return ticket;
}

async function directCleanup() {
  if (!testUserId) return;
  const versions = await admin
    .from("document_versions")
    .select("storage_bucket,storage_path")
    .eq("owner_id", testUserId);
  if (!versions.error) {
    const byBucket = new Map();
    for (const version of versions.data ?? []) {
      const paths = byBucket.get(version.storage_bucket) ?? [];
      paths.push(version.storage_path);
      byBucket.set(version.storage_bucket, paths);
    }
    for (const [bucket, paths] of byBucket) {
      await admin.storage.from(bucket).remove(paths);
    }
  }
  await admin.from("documents").delete().eq("owner_id", testUserId);
  await admin.auth.admin.deleteUser(testUserId);
}

try {
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: "PDFMantra production acceptance" },
  });
  if (created.error || !created.data.user) throw created.error ?? new Error("Test user was not created.");
  testUserId = created.data.user.id;

  const signedIn = await publicClient.auth.signInWithPassword({ email, password });
  if (signedIn.error || !signedIn.data.session) throw signedIn.error ?? new Error("Test session was not created.");
  const sessionSet = await ssrClient.auth.setSession({
    access_token: signedIn.data.session.access_token,
    refresh_token: signedIn.data.session.refresh_token,
  });
  if (sessionSet.error) throw sessionSet.error;
  assert.ok(cookieHeader(), "SSR authentication cookie was not created.");

  const original = await createPdf("original");
  const originalTicket = await uploadAndFinalize(
    await initializeUpload({ bytes: original, label: "Original" }),
    original,
  );
  documentId = originalTicket.documentId;
  originalVersionId = originalTicket.versionId;

  const revised = await createPdf("revised version");
  const revisedTicket = await uploadAndFinalize(
    await initializeUpload({
      bytes: revised,
      existingDocumentId: documentId,
      label: "Acceptance revision",
    }),
    revised,
  );
  secondVersionId = revisedTicket.versionId;

  let workspace = await appRequest("/api/workspace/documents");
  const document = workspace.documents.find((item) => item.id === documentId);
  assert.ok(document, "Uploaded document is missing from the authenticated workspace.");
  assert.equal(document.versions.length, 2);
  assert.equal(document.latestVersionId, secondVersionId);

  await appRequest(
    `/api/workspace/documents/${documentId}/versions/${originalVersionId}`,
    { method: "PATCH", body: JSON.stringify({ action: "restore" }) },
  );
  workspace = await appRequest("/api/workspace/documents");
  assert.equal(
    workspace.documents.find((item) => item.id === documentId)?.latestVersionId,
    originalVersionId,
  );

  const download = await appRequest(`/api/workspace/versions/${originalVersionId}/download`);
  const downloaded = new Uint8Array(await (await fetch(download.url)).arrayBuffer());
  assert.equal(checksum(downloaded), checksum(original));

  await appRequest(`/api/workspace/documents/${documentId}/versions/${secondVersionId}`, {
    method: "DELETE",
  });
  secondVersionId = null;
  await appRequest(`/api/workspace/documents/${documentId}`, { method: "DELETE" });
  documentId = null;

  console.log(JSON.stringify({
    result: "passed",
    baseUrl: baseUrl.origin,
    authenticatedSession: "passed",
    originalUpload: "passed",
    versionUpload: "passed",
    restore: "passed",
    downloadChecksum: "passed",
    deletionCleanup: "passed",
  }, null, 2));
} finally {
  await directCleanup();
}
