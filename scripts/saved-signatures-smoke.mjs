import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  isPng,
  isSavedSignatureType,
  MAX_SAVED_SIGNATURE_BYTES,
  MAX_SAVED_SIGNATURES,
  normalizeSignatureDimension,
  sanitizeSignatureLabel,
} from "../src/lib/saved-signatures.ts";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [collectionRoute, itemRoute, fillSignPage, migration] = await Promise.all([
  read("../src/app/api/signatures/route.ts"),
  read("../src/app/api/signatures/[signatureId]/route.ts"),
  read("../src/app/tools/fill-sign/page.tsx"),
  read("../supabase/migrations/0011_saved_signature_storage_hardening.sql"),
]);

assert.equal(MAX_SAVED_SIGNATURES, 12);
assert.equal(MAX_SAVED_SIGNATURE_BYTES, 2 * 1024 * 1024);
assert.equal(sanitizeSignatureLabel("  Work   sign  "), "Work sign");
assert.equal(sanitizeSignatureLabel(" "), "My signature");
assert.equal(isSavedSignatureType("drawn"), true);
assert.equal(isSavedSignatureType("invalid"), false);
assert.equal(normalizeSignatureDimension("240"), 240);
assert.equal(normalizeSignatureDimension("-1"), null);
assert.equal(isPng(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), true);

assert.match(collectionRoute, /isSameSiteStateChangingRequest/);
assert.match(collectionRoute, /supabase\.auth\.getUser/);
assert.match(collectionRoute, /\.eq\("owner_id", context\.user\.id\)/);
assert.match(collectionRoute, /MAX_SAVED_SIGNATURES/);
assert.match(collectionRoute, /MAX_SAVED_SIGNATURE_BYTES/);
assert.match(collectionRoute, /createSignedUrl/);
assert.match(collectionRoute, /storagePath = `\$\{context\.user\.id\}\/\$\{id\}\.png`/);
assert.match(itemRoute, /isSameSiteStateChangingRequest/);
assert.match(itemRoute, /\.eq\("owner_id", user\.id\)/);
assert.match(itemRoute, /\.remove\(\[existing\.data\.storage_path\]\)/);

assert.match(fillSignPage, /identityType !== "user"/);
assert.match(fillSignPage, /saveCurrentSignature/);
assert.match(fillSignPage, /selectSavedSignature/);
assert.match(fillSignPage, /deleteSavedSignature/);
assert.match(fillSignPage, /Uploaded · transparent/);
assert.match(fillSignPage, /removeLightBackground/);
assert.match(fillSignPage, /object\.pageNumber === activePageNumber/);
assert.doesNotMatch(fillSignPage, /className="fixed bottom-4 left-1\/2 z-50/);

assert.match(migration, /public = false/);
assert.match(migration, /file_size_limit = 2097152/);
assert.match(migration, /allowed_mime_types = array\['image\/png'\]/);
assert.match(migration, /enforce_saved_signature_limit/);
assert.match(migration, /count\(\*\) >= 12/);
assert.match(migration, /pg_advisory_xact_lock/);
assert.match(fillSignPage, /MAX_IMPORTED_IMAGE_PIXELS/);
assert.match(fillSignPage, /allowedMimeTypes\.includes/);

console.log(
  JSON.stringify({
    accountSignatureLibrary: "passed",
    signatureStorageIsolation: "passed",
    transparentSignatureUpload: "passed",
    pageScopedObjects: "passed",
    inlineObjectInspector: "passed",
  }),
);
