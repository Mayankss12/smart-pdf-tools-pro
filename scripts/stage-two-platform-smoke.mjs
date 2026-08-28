import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PDFDocument, StandardFonts } from "pdf-lib";

import { canUseToolByTier } from "../src/lib/entitlements.ts";
import { getHomepageToolGridTools } from "../src/lib/home/homepage-tools.ts";
import { compareTextContent } from "../src/lib/pdf-compare-engine.ts";
import { inspectPdfaReadiness, preparePdfForArchival } from "../src/lib/pdfa-engine.ts";
import { createEditorFormFields } from "../src/lib/pdf-tools/editor-form-engine.ts";
import { getEditorPageGeometry } from "../src/lib/pdf-tools/editor-page-geometry.ts";
import { isToolPubliclyLaunchReady } from "../src/lib/public-launch.ts";
import { getPublicLaunchCapabilitySnapshot } from "../src/lib/public-launch-snapshot.ts";
import { getToolById } from "../src/lib/tools.ts";

const textDifference = compareTextContent(
  "Invoice 2026 approved by Finance",
  "Invoice 2026 approved by Finance and Legal",
);
assert.equal(textDifference.similarity > 80, true);
assert.deepEqual(textDifference.added, ["and", "legal"]);
assert.deepEqual(textDifference.removed, []);

const sourceDocument = await PDFDocument.create();
const page = sourceDocument.addPage([612, 792]);
const font = await sourceDocument.embedFont(StandardFonts.Helvetica);
page.drawText("PDFMantra Stage Two archival fixture", { x: 72, y: 700, size: 16, font });
sourceDocument.setTitle("Stage Two Source");
const sourceBytes = await sourceDocument.save({ useObjectStreams: false });

const preflight = await inspectPdfaReadiness(sourceBytes);
assert.equal(preflight.pageCount, 1);
assert.equal(preflight.certificationRequired, true);
assert.equal(preflight.declaredPart, null);
assert.equal(preflight.appearsPdfa, false);
assert.equal(preflight.checks.some((check) => check.id === "output-intent" && check.status === "fail"), true);

const preparedBytes = await preparePdfForArchival(sourceBytes, {
  title: "Archive Record",
  author: "PDFMantra",
  language: "en-IN",
});
const preparedDocument = await PDFDocument.load(preparedBytes);
assert.equal(preparedDocument.getTitle(), "Archive Record");
assert.equal(preparedDocument.getAuthor(), "PDFMantra");
const preparedReport = await inspectPdfaReadiness(preparedBytes);
assert.equal(preparedReport.certificationRequired, true);
assert.equal(preparedReport.declaredPart, null, "Preparation must not add a false PDF/A declaration.");

const formDocument = await PDFDocument.create();
formDocument.addPage([612, 792]);
const formResult = await createEditorFormFields({
  pdfDoc: formDocument,
  objects: [
    {
      id: "stage-two-name",
      pageNumber: 1,
      box: { x: 72, y: 100, width: 220, height: 34 },
      data: { formField: { type: "text", name: "CustomerName", required: true } },
    },
    {
      id: "stage-two-approval",
      pageNumber: 1,
      box: { x: 72, y: 150, width: 24, height: 24 },
      data: { formField: { type: "checkbox", name: "Approved" } },
    },
  ],
  getGeometry: getEditorPageGeometry,
});
assert.equal(formResult.createdCount, 2);
const formReloaded = await PDFDocument.load(await formDocument.save());
assert.equal(formReloaded.getForm().getFields().length, 2);
assert.equal(formReloaded.getForm().getTextField("CustomerName").isRequired(), true);

const snapshot = getPublicLaunchCapabilitySnapshot();
const homepageIds = new Set(getHomepageToolGridTools(snapshot).map((tool) => tool.id));
const stageTwoIds = ["compare-pdf", "form-creator", "pdfa-preflight"];
for (const id of stageTwoIds) {
  const tool = getToolById(id);
  assert.ok(tool, `Missing Stage 2 tool ${id}`);
  assert.equal(tool.status, "working");
  assert.equal(tool.capabilities.processingMode, "browser");
  assert.equal(isToolPubliclyLaunchReady(tool, snapshot), true);
  assert.equal(homepageIds.has(id), true);
}

for (const toolKey of ["compare", "pdfa", "form-creator"]) {
  assert.equal(canUseToolByTier({ tier: "guest", toolKey }), false);
  assert.equal(canUseToolByTier({ tier: "free", toolKey }), false);
  assert.equal(canUseToolByTier({ tier: "plus", toolKey }), true);
  assert.equal(canUseToolByTier({ tier: "admin", toolKey }), true);
}

const [compareSource, pdfaSource, formSource, ocrEngineSource, ocrPageSource] = await Promise.all(
  [
    "../src/components/PdfCompareToolClient.tsx",
    "../src/components/PdfaToolClient.tsx",
    "../src/components/PdfFormCreatorClient.tsx",
    "../src/lib/pdf-ocr-engine.ts",
    "../src/app/tools/ocr/page.tsx",
  ].map((path) => readFile(new URL(path, import.meta.url), "utf8")),
);
assert.match(compareSource, /comparePdfFiles/);
assert.match(compareSource, /serializePdfComparison/);
assert.match(compareSource, /prepareEntitledExport/);
assert.match(pdfaSource, /not an ISO 19005 certification/);
assert.match(pdfaSource, /prepareEntitledExport/);
assert.match(formSource, /createEditorFormFields/);
assert.match(formSource, /MAX_FORM_FIELDS = 200/);
assert.match(formSource, /prepareEntitledExport/);
assert.match(ocrEngineSource, /applyOtsuBinarization/);
assert.match(ocrEngineSource, /deskewed/);
assert.match(ocrEngineSource, /averageConfidence/);
assert.match(ocrPageSource, /Faded or noisy document/);
assert.match(ocrPageSource, /low-confidence page/);

console.log(
  JSON.stringify({
    pdfComparison: "passed",
    pdfaPreflight: "passed",
    pdfaHonestPreparation: "passed",
    formCreator: "passed",
    ocrProfessionalPipeline: "passed",
    publicDiscovery: stageTwoIds.length,
    advancedEntitlements: "passed",
  }),
);
