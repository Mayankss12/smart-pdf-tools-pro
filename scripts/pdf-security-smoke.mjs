import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PDFDocument, StandardFonts } from "pdf-lib";
import {
  createPdfToolkit,
  PdfPasswordError,
} from "pdfstudio";

import {
  getPasswordStrength,
  hasPdfDigitalSignatureMarker,
  validateProtectPassword,
} from "../src/lib/pdf-security.ts";
import { getHomepageToolGridTools } from "../src/lib/home/homepage-tools.ts";
import { getPublicLaunchCapabilitySnapshot } from "../src/lib/public-launch-snapshot.ts";
import { getToolById } from "../src/lib/tools.ts";

async function createSourcePdf() {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([612, 792]);
  page.drawText("PDFMantra security round trip", {
    x: 72,
    y: 720,
    size: 18,
    font,
  });
  pdf.setTitle("PDFMantra security test");
  pdf.setAuthor("PDFMantra");
  return pdf.save({ useObjectStreams: true });
}

assert.doesNotThrow(() => validateProtectPassword("Strong-pass-2026"));
assert.throws(() => validateProtectPassword("short"), /at least 8 characters/);
assert.equal(getPasswordStrength("abc").label, "Weak");
assert.equal(getPasswordStrength("Strong-pass-2026").label, "Strong");
assert.equal(
  hasPdfDigitalSignatureMarker(
    new TextEncoder().encode("%PDF-1.7\n1 0 obj << /ByteRange [0 10 20 30] >>"),
  ),
  true,
);
assert.equal(
  hasPdfDigitalSignatureMarker(new TextEncoder().encode("%PDF-1.7\nplain")),
  false,
);

const toolkit = await createPdfToolkit();
const source = await createSourcePdf();
const password = "Correct-horse-2026";

assert.equal(await toolkit.isEncrypted(source), false);

const protectedBytes = await toolkit.lock(source, {
  userPassword: password,
  ownerPassword: "owner-password-kept-separate",
  keyLength: 256,
  permissions: {
    print: "none",
    modify: "none",
    extract: false,
    accessibility: true,
  },
});

assert.equal(await toolkit.isEncrypted(protectedBytes), true);
assert.equal(await toolkit.requiresPassword(protectedBytes), true);

const protectedInfo = await toolkit.getInfo(protectedBytes, { password });
assert.equal(protectedInfo.encrypted, true);
assert.equal(protectedInfo.encryption?.bits, 256);
assert.match(protectedInfo.encryption?.method ?? "", /^AES/);
assert.equal(protectedInfo.encryption?.permissions.print, false);
assert.equal(protectedInfo.encryption?.permissions.extract, false);
assert.equal(protectedInfo.encryption?.permissions.modify, false);

await assert.rejects(
  toolkit.unlock(protectedBytes, { password: "wrong-password" }),
  (error) => error instanceof PdfPasswordError,
);
// The Emscripten CLI mirrors qpdf's expected non-zero status onto Node's
// process exit code even though the wrapper correctly rejects the promise.
process.exitCode = 0;

const unlockedBytes = await toolkit.unlock(protectedBytes, { password });
assert.equal(await toolkit.isEncrypted(unlockedBytes), false);
const unlockedPdf = await PDFDocument.load(unlockedBytes);
assert.equal(unlockedPdf.getPageCount(), 1);
assert.equal(unlockedPdf.getTitle(), "PDFMantra security test");
assert.equal(unlockedPdf.getAuthor(), "PDFMantra");

const restrictionsOnly = await toolkit.lock(source, {
  userPassword: "",
  ownerPassword: "owner-only-password",
  keyLength: 256,
  permissions: { print: "none", modify: "none", extract: false },
});
assert.equal(await toolkit.isEncrypted(restrictionsOnly), true);
assert.equal(await toolkit.requiresPassword(restrictionsOnly), false);
const restrictionsRemoved = await toolkit.unlock(restrictionsOnly, {
  password: "",
});
assert.equal(await toolkit.isEncrypted(restrictionsRemoved), false);

const [protectPage, unlockPage, clientSource, workerSource, clientRunnerSource] =
  await Promise.all(
    [
      "../src/app/tools/protect/page.tsx",
      "../src/app/tools/unlock/page.tsx",
      "../src/components/PdfSecurityToolClient.tsx",
      "../src/workers/pdf-security.worker.ts",
      "../src/lib/pdf-security-client.ts",
    ].map((path) => readFile(new URL(path, import.meta.url), "utf8")),
  );

for (const sourceCode of [protectPage, unlockPage]) {
  assert.match(sourceCode, /PdfSecurityToolClient/);
  assert.match(sourceCode, /requirePublicLaunchReadyTool/);
  assert.doesNotMatch(sourceCode, /BackendToolShell/);
}

assert.match(clientSource, /processed locally|processed on this device/);
assert.match(clientSource, /I own this PDF or have permission/);
assert.match(clientSource, /does not guess, crack, or bypass/);
assert.match(clientSource, /digital signature/i);
assert.match(clientSource, /recordExport/);
assert.match(clientSource, /inputRef\.current\.value = ""/);
assert.match(clientSource, /setShowPassword\(false\)/);
assert.match(workerSource, /keyLength: 256/);
assert.match(workerSource, /OUTPUT_VERIFICATION_FAILED/);
assert.match(workerSource, /toolkit\.isEncrypted\(output\)/);
assert.doesNotMatch(workerSource, /console\.(log|warn|error)/);
assert.match(clientRunnerSource, /new Worker/);
assert.match(clientRunnerSource, /worker\.terminate\(\)/);
assert.match(clientRunnerSource, /WORKER_TIMEOUT_MS/);

for (const id of ["protect-pdf", "unlock-pdf"]) {
  const tool = getToolById(id);
  assert.ok(tool);
  assert.equal(tool.status, "working");
  assert.equal(tool.isClientOnly, true);
  assert.equal(tool.capabilities.processingMode, "browser");
  assert.equal(tool.capabilities.needsBackendProcessing, false);
}

const homepageToolIds = new Set(
  getHomepageToolGridTools(getPublicLaunchCapabilitySnapshot()).map(
    (tool) => tool.id,
  ),
);
assert.equal(homepageToolIds.has("protect-pdf"), true);
assert.equal(homepageToolIds.has("unlock-pdf"), true);

const vendoredWasm = await readFile(
  new URL("../public/pdf-security/qpdf.wasm", import.meta.url),
);
const packageWasm = await readFile(
  new URL("../node_modules/pdfstudio/dist/wasm/qpdf.wasm", import.meta.url),
);
assert.ok(vendoredWasm.byteLength > 2_000_000);
assert.deepEqual(vendoredWasm, packageWasm);

console.log(
  JSON.stringify({
    aes256Protection: "passed",
    wrongPasswordRejection: "passed",
    authorizedUnlock: "passed",
    restrictionOnlyUnlock: "passed",
    metadataAndPagePreservation: "passed",
    workerIsolationAndCancellation: "passed",
    publicDiscovery: "passed",
    wasmAssetIntegrity: "passed",
    protectedSize: protectedBytes.byteLength,
    unlockedSize: unlockedBytes.byteLength,
  }),
);
process.exitCode = 0;
