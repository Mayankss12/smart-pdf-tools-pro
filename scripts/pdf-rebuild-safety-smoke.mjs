import assert from "node:assert/strict";

import { PDFDocument, PDFName, PDFString, degrees } from "pdf-lib";

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

async function createAnnotationFile({ risky }) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([300, 500]);
  const action = risky
    ? {
        Type: "Action",
        S: "JavaScript",
        JS: PDFString.of("app.alert('blocked by compatibility warning')"),
      }
    : {
        Type: "Action",
        S: "URI",
        URI: PDFString.of("https://example.com"),
      };
  const link = pdf.context.register(
    pdf.context.obj({
      Type: "Annot",
      Subtype: "Link",
      Rect: [20, 20, 180, 45],
      Border: [0, 0, 0],
      A: action,
    }),
  );
  const highlight = pdf.context.register(
    pdf.context.obj({
      Type: "Annot",
      Subtype: "Highlight",
      Rect: [20, 60, 180, 90],
      QuadPoints: [20, 90, 180, 90, 20, 60, 180, 60],
    }),
  );

  page.node.set(PDFName.of("Annots"), pdf.context.obj([link, highlight]));

  return new File([await pdf.save()], risky ? "risky-annotations.pdf" : "safe-annotations.pdf", {
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

const safeAnnotationFile = await createAnnotationFile({ risky: false });
const safeAnnotationReport = await inspectPdfCompatibility(safeAnnotationFile);
assert.equal(
  safeAnnotationReport.hasInteractiveAnnotations,
  false,
  "Standard URI links and ordinary markup annotations must not trigger a rebuild warning",
);
assert.equal(
  buildPdfCompatibilityWarning([safeAnnotationReport], "Merge PDFs"),
  null,
  "Safe annotations must not show the compatibility popup",
);

const riskyAnnotationFile = await createAnnotationFile({ risky: true });
const riskyAnnotationReport = await inspectPdfCompatibility(riskyAnnotationFile);
assert.equal(
  riskyAnnotationReport.hasInteractiveAnnotations,
  true,
  "JavaScript annotation actions must remain warning-worthy",
);
assert.match(
  buildPdfCompatibilityWarning([riskyAnnotationReport], "Merge PDFs"),
  /interactive annotation types or actions/i,
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
    safeAnnotationWarningSuppression: "passed",
    riskyAnnotationWarning: "passed",
    invalidMagicBytes: "passed",
    metadataPreservation: "passed",
    pageSizeOrderRotation: "passed",
    rebuildProgress: "passed",
  }),
);
