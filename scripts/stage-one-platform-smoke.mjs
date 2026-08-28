import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PDFDocument, StandardFonts } from "pdf-lib";
import { createPdfToolkit } from "pdfstudio";

import {
  addBatesNumbers,
  cropPdf,
  readPdfMetadata,
  splitPdfAtPages,
  splitPdfByApproximateSize,
  updatePdfMetadata,
} from "../src/lib/pdf-stage-one.ts";
import { getHomepageToolGridTools } from "../src/lib/home/homepage-tools.ts";
import { getPublicLaunchCapabilitySnapshot } from "../src/lib/public-launch-snapshot.ts";
import { isToolPubliclyLaunchReady } from "../src/lib/public-launch.ts";
import { sanitizeTelemetryPayload } from "../src/lib/telemetry.ts";
import { getToolById } from "../src/lib/tools.ts";

async function fixture() {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  for (let index = 0; index < 4; index += 1) {
    const page = document.addPage([612, 792]);
    page.drawText(index === 2 ? "Chapter Two" : `Office record ${index + 1}`, { x: 72, y: 700, size: 18, font });
  }
  const form = document.getForm();
  const field = form.createTextField("office-reference");
  field.setText("PDFM-stage-one");
  field.addToPage(document.getPage(0), { x: 72, y: 620, width: 220, height: 30 });
  document.setTitle("Original title");
  document.setAuthor("Office Test");
  return document.save({ useObjectStreams: true });
}

const source = await fixture();

const metadataBytes = await updatePdfMetadata(source, {
  title: "Stage One Document",
  author: "PDFMantra",
  subject: "Regression",
  keywords: "stage one, office, pdf",
  creator: "PDFMantra smoke",
  producer: "PDFMantra",
});
const metadata = await readPdfMetadata(metadataBytes);
assert.equal(metadata.title, "Stage One Document");
assert.equal(metadata.author, "PDFMantra");
assert.match(metadata.keywords, /stage one/);
assert.equal(metadata.pageCount, 4);

const clearedBytes = await updatePdfMetadata(metadataBytes, { clearAll: true });
const cleared = await readPdfMetadata(clearedBytes);
assert.equal(cleared.title, "");
assert.equal(cleared.author, "");

const croppedBytes = await cropPdf(source, { top: 18, right: 20, bottom: 22, left: 24 });
const cropped = await PDFDocument.load(croppedBytes);
assert.deepEqual(cropped.getPage(0).getCropBox(), { x: 24, y: 22, width: 568, height: 752 });
await assert.rejects(() => cropPdf(source, { top: 400, right: 400, bottom: 400, left: 400 }), /smaller than/);

const batesBytes = await addBatesNumbers(source, { prefix: "CASE-", suffix: "", startNumber: 42, digits: 6, position: "bottom-right", fontSize: 10, margin: 24 });
assert.equal((await PDFDocument.load(batesBytes)).getPageCount(), 4);
assert.ok(batesBytes.byteLength > source.byteLength);

const pageParts = await splitPdfAtPages(source, [3]);
assert.equal(pageParts.length, 2);
assert.equal((await PDFDocument.load(pageParts[0])).getPageCount(), 2);
assert.equal((await PDFDocument.load(pageParts[1])).getPageCount(), 2);

const sizeParts = await splitPdfByApproximateSize(source, 64 * 1024);
assert.ok(sizeParts.length >= 1);
assert.equal(
  (await Promise.all(sizeParts.map(async (part) => (await PDFDocument.load(part)).getPageCount()))).reduce((sum, count) => sum + count, 0),
  4,
);

const toolkit = await createPdfToolkit();
const repaired = await toolkit.repair(source);
assert.equal(await toolkit.pageCount(repaired), 4);
const flattened = await toolkit.flatten(source, { annotations: "all" });
assert.equal(await toolkit.pageCount(flattened), 4);
const flattenedDocument = await PDFDocument.load(flattened);
assert.equal(flattenedDocument.getForm().getFields().length, 0);

const stageOneIds = [
  "redact-pdf",
  "crop-pdf",
  "flatten-pdf",
  "repair-pdf",
  "pdf-metadata",
  "bates-numbering",
  "advanced-split",
  "batch-workflows",
];
const snapshot = getPublicLaunchCapabilitySnapshot();
const homepageIds = new Set(getHomepageToolGridTools(snapshot).map((tool) => tool.id));
for (const id of stageOneIds) {
  const tool = getToolById(id);
  assert.ok(tool, `Missing Stage 1 tool ${id}`);
  assert.equal(tool.status, "working");
  assert.equal(tool.capabilities.processingMode, "browser");
  assert.equal(isToolPubliclyLaunchReady(tool, snapshot), true);
  assert.equal(homepageIds.has(id), true);
}

const telemetry = sanitizeTelemetryPayload({
  eventType: "client-error",
  route: "/tools/repair",
  errorName: "Error",
  errorMessage: "failed for user@example.com at https://private.test/path",
});
assert.ok(telemetry);
assert.doesNotMatch(telemetry.errorMessage ?? "", /user@example|private\.test/);
assert.equal(sanitizeTelemetryPayload({ eventType: "web-vital", route: "/", metricName: "INVALID", metricValue: 1 }), null);

const sources = await Promise.all([
  "../src/components/PdfRedactToolClient.tsx",
  "../src/components/AdvancedSplitToolClient.tsx",
  "../src/components/BatchWorkflowToolClient.tsx",
  "../src/components/ReliabilityTelemetry.tsx",
  "../src/app/api/telemetry/route.ts",
  "../src/app/api/admin/overview/route.ts",
  "../src/app/global-error.tsx",
  "../supabase/migrations/0006_client_telemetry.sql",
].map((path) => readFile(new URL(path, import.meta.url), "utf8")));
assert.match(sources[0], /permanentlyRedactPdf/);
assert.match(sources[0], /irreversible and fully flattened/);
assert.match(sources[1], /bookmarkStartPages/);
assert.match(sources[1], /textStartPages/);
assert.match(sources[2], /STAGE_ONE_BATCH_MAX_FILES/);
assert.match(sources[3], /useReportWebVitals/);
assert.match(sources[4], /sanitizeTelemetryPayload/);
assert.match(sources[5], /client_telemetry/);
assert.match(sources[6], /Your source file remains on your device/);
assert.match(sources[7], /enable row level security/);
assert.doesNotMatch(sources[7], /create policy/i);

console.log(JSON.stringify({
  metadata: "passed",
  crop: "passed",
  bates: "passed",
  advancedSplit: "passed",
  repair: "passed",
  flatten: "passed",
  publicDiscovery: stageOneIds.length,
  telemetrySanitization: "passed",
  adminReliability: "passed",
}));
