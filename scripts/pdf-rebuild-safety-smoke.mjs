import assert from "node:assert/strict";

import { PDFDocument, degrees } from "pdf-lib";

import {
  buildPdfCompatibilityWarning,
  inspectPdfCompatibility,
} from "../src/lib/pdf-document-safety.ts";
import {
  deletePdfPages,
  extractPdfPages,
  reorderPdfPages,
} from "../src/lib/pdf-page-engine.ts";
import {
  mergePdfFiles,
  splitPdfIntoGroups,
} from "../src/lib/pdf-engine.ts";

async function createSourceFile() {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Safety smoke");
  pdf.setAuthor("PDFMantra");
  pdf.setSubject("Metadata preservation");
  pdf.setKeywords(["standalone", "safety"]);
  pdf.setCreator("Smoke test");
  pdf.setCreationDate(new Date("2024-01-02T03:04:05.000Z"));
  pdf.addPage([300, 500]);
  const rotated = pdf.addPage([700, 400]);
  rotated.setRotation(degrees(90));
  pdf.getForm().createTextField("customer.name");
  return new File([await pdf.save()], "safety.pdf", {
    type: "application/pdf",
  });
}

const sourceFile = await createSourceFile();
const report = await inspectPdfCompatibility(sourceFile);
assert.equal(report.pageCount, 2);
assert.equal(report.hasAcroForm, true);
assert.match(
  buildPdfCompatibilityWarning([report], "Rebuild PDF"),
  /form fields may be removed/i,
);

const invalidFile = new File(["not a pdf"], "fake.pdf", {
  type: "application/pdf",
});
await assert.rejects(inspectPdfCompatibility(invalidFile), /PDF signature/);

for (const result of [
  await deletePdfPages(sourceFile, [1]),
  await extractPdfPages(sourceFile, [2]),
  await reorderPdfPages(sourceFile, [2, 1]),
]) {
  const output = await PDFDocument.load(await result.blob.arrayBuffer());
  assert.equal(output.getTitle(), "Safety smoke");
  assert.equal(output.getAuthor(), "PDFMantra");
  assert.equal(output.getSubject(), "Metadata preservation");
}

const reordered = await reorderPdfPages(sourceFile, [2, 1]);
const reorderedPdf = await PDFDocument.load(await reordered.blob.arrayBuffer());
assert.deepEqual(reorderedPdf.getPage(0).getSize(), {
  width: 700,
  height: 400,
});
assert.equal(reorderedPdf.getPage(0).getRotation().angle, 90);

const mergeProgress = [];
await mergePdfFiles([sourceFile, sourceFile], (progress) => {
  mergeProgress.push(progress);
});
assert.deepEqual(mergeProgress, [
  { completed: 1, total: 2 },
  { completed: 2, total: 2 },
]);

const splitProgress = [];
await splitPdfIntoGroups(
  sourceFile,
  [
    { label: "first", pages: [1] },
    { label: "second", pages: [2] },
  ],
  (progress) => {
    splitProgress.push(progress);
  },
);
assert.deepEqual(splitProgress, [
  { completed: 1, total: 2 },
  { completed: 2, total: 2 },
]);

console.log(
  JSON.stringify({
    compatibilityWarning: "passed",
    invalidMagicBytes: "passed",
    metadataPreservation: "passed",
    pageSizeOrderRotation: "passed",
    rebuildProgress: "passed",
  }),
);
